const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiError = require('./ApiError');

/**
 * Atomically deduct stock for every item in an order, exactly once.
 *
 * - Runs inside a MongoDB transaction (Atlas = replica set) so the multi-item
 *   deduction is all-or-nothing: if any single item is short, nothing is deducted.
 * - Per-item guard uses a conditional update ({ stockQuantity: { $gte: qty } }) so two
 *   concurrent payments for the last unit cannot oversell — only one update matches.
 * - Idempotent: the order's `stockDeducted` flag is checked inside the transaction,
 *   so confirmPayment + the Stripe webhook (or a retried call) never double-deduct.
 *
 * NOTE: the `$gte` guard MUST be wrapped in `mongoose.trusted(...)` because the project
 * enables `sanitizeFilter` globally (config/database.js), which would otherwise rewrite
 * `{ $gte: n }` into `{ $eq: { $gte: n } }` and match nothing.
 *
 * @throws {ApiError} 400 when any item has insufficient stock (transaction aborts).
 * @returns {Promise<Order>} the order document after deduction.
 */
async function deductOrderStock(orderId) {
  const session = await mongoose.startSession();
  try {
    let resultOrder;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        throw new ApiError(404, 'Sifariş tapılmadı');
      }

      // Already deducted — no-op (idempotent across confirm + webhook + retries)
      if (order.stockDeducted) {
        resultOrder = order;
        return;
      }

      for (const item of order.items) {
        const updated = await Product.findOneAndUpdate(
          {
            _id: item.product,
            stockQuantity: mongoose.trusted({ $gte: item.quantity })
          },
          { $inc: { stockQuantity: -item.quantity, totalSales: item.quantity } },
          { session, new: true }
        );

        if (!updated) {
          // Insufficient stock for this item → abort the whole transaction
          throw new ApiError(400, `${item.name} üçün stokda kifayət qədər məhsul yoxdur`);
        }
      }

      order.stockDeducted = true;
      await order.save({ session, validateBeforeSave: false });
      resultOrder = order;
    });

    return resultOrder;
  } finally {
    session.endSession();
  }
}

module.exports = deductOrderStock;
