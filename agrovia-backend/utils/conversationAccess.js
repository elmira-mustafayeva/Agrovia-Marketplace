const Conversation = require('../models/Conversation');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiError = require('./ApiError');

const idStr = (v) => (v && v._id ? String(v._id) : String(v));

// Read access: a participant, or an admin for support / courier-linked chats (per spec).
// buyer_seller private chats are restricted to their two participants only.
function canAccess(user, convo) {
  if (!user || !convo) return false;
  const uid = String(user._id);
  const inParticipants = (convo.participants || []).some((p) => idStr(p) === uid);
  if (inParticipants) return true;
  if (user.role === 'admin' && ['support', 'buyer_courier', 'seller_courier'].includes(convo.type)) return true;
  return false;
}

// Send access: read access AND the conversation is open. Courier-linked chats become
// read-only once the linked order is delivered/cancelled (computed — order state untouched).
async function canSend(user, convo) {
  if (!canAccess(user, convo)) return { ok: false, status: 403, message: 'Bu söhbətə giriş icazəniz yoxdur' };
  if (convo.isActive === false) return { ok: false, status: 403, message: 'Söhbət bağlanıb' };

  if ((convo.type === 'buyer_courier' || convo.type === 'seller_courier') && convo.order) {
    const order = await Order.findById(convo.order).select('status');
    if (order && ['delivered', 'cancelled'].includes(order.status)) {
      return { ok: false, status: 403, message: 'Sifariş tamamlandığı üçün söhbət bağlıdır' };
    }
  }
  return { ok: true };
}

// Find-or-create a conversation, validating the requester's ownership for the given type.
// payload: { type, productId?, orderId?, sellerId? }
async function findOrCreate(user, { type, productId, orderId, sellerId }) {
  const uid = String(user._id);

  if (type === 'buyer_seller') {
    let buyer;
    let seller;
    let product;
    let order;

    if (productId) {
      product = await Product.findById(productId).select('seller');
      if (!product) throw new ApiError(404, 'Məhsul tapılmadı');
      seller = product.seller;
      if (user.role === 'buyer') {
        buyer = user._id;
      } else if (idStr(seller) === uid) {
        throw new ApiError(400, 'Öz məhsulunuza yaza bilməzsiniz');
      } else {
        throw new ApiError(403, 'İcazə yoxdur');
      }
    } else if (orderId) {
      order = await Order.findById(orderId).select('buyer items.seller');
      if (!order) throw new ApiError(404, 'Sifariş tapılmadı');
      buyer = order.buyer;
      if (user.role === 'seller') {
        if (!order.items.some((it) => idStr(it.seller) === uid)) {
          throw new ApiError(403, 'Bu sifarişdə məhsulunuz yoxdur');
        }
        seller = user._id;
      } else {
        throw new ApiError(400, 'Məhsul seçin');
      }
    } else {
      throw new ApiError(400, 'Məhsul və ya sifariş tələb olunur');
    }

    const key = product
      ? { type, buyer, seller, product: product._id }
      : { type, buyer, seller, order: order._id };
    let convo = await Conversation.findOne(key);
    if (!convo) {
      convo = await Conversation.create({
        type, buyer, seller, product: product?._id, order: order?._id,
        participants: [buyer, seller], lastMessageAt: new Date()
      });
    }
    return convo;
  }

  if (type === 'buyer_courier') {
    if (!orderId) throw new ApiError(400, 'Sifariş tələb olunur');
    const order = await Order.findById(orderId).select('buyer courier');
    if (!order) throw new ApiError(404, 'Sifariş tapılmadı');
    if (!order.courier) throw new ApiError(400, 'Sifarişə kuryer təyin olunmayıb');
    const isBuyer = idStr(order.buyer) === uid;
    const isCourier = idStr(order.courier) === uid;
    if (!isBuyer && !isCourier && user.role !== 'admin') throw new ApiError(403, 'İcazə yoxdur');

    let convo = await Conversation.findOne({ type, order: order._id });
    if (!convo) {
      convo = await Conversation.create({
        type, buyer: order.buyer, courier: order.courier, order: order._id,
        participants: [order.buyer, order.courier], lastMessageAt: new Date()
      });
    }
    return convo;
  }

  if (type === 'seller_courier') {
    if (!orderId) throw new ApiError(400, 'Sifariş tələb olunur');
    const order = await Order.findById(orderId).select('courier items.seller');
    if (!order) throw new ApiError(404, 'Sifariş tapılmadı');
    if (!order.courier) throw new ApiError(400, 'Sifarişə kuryer təyin olunmayıb');

    let theSeller;
    if (user.role === 'seller') {
      if (!order.items.some((it) => idStr(it.seller) === uid)) {
        throw new ApiError(403, 'Bu sifarişdə məhsulunuz yoxdur');
      }
      theSeller = user._id;
    } else if (idStr(order.courier) === uid || user.role === 'admin') {
      // Courier/admin initiating — target a specific seller (or the first item seller).
      theSeller = sellerId && order.items.some((it) => idStr(it.seller) === String(sellerId))
        ? sellerId
        : order.items[0]?.seller;
      if (!theSeller) throw new ApiError(400, 'Satıcı tapılmadı');
    } else {
      throw new ApiError(403, 'İcazə yoxdur');
    }

    let convo = await Conversation.findOne({ type, order: order._id, seller: theSeller });
    if (!convo) {
      convo = await Conversation.create({
        type, seller: theSeller, courier: order.courier, order: order._id,
        participants: [theSeller, order.courier], lastMessageAt: new Date()
      });
    }
    return convo;
  }

  if (type === 'support') {
    let convo = await Conversation.findOne({ type, user: user._id });
    if (!convo) {
      convo = await Conversation.create({
        type, user: user._id, participants: [user._id], lastMessageAt: new Date()
      });
    }
    return convo;
  }

  throw new ApiError(400, 'Yanlış söhbət tipi');
}

module.exports = { canAccess, canSend, findOrCreate, idStr };
