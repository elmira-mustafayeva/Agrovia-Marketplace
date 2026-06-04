import { createSlice } from '@reduxjs/toolkit';

const storedUser = localStorage.getItem('agrovia_user');
const storedToken = localStorage.getItem('agrovia_token');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken || null
  },
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('agrovia_user', JSON.stringify(action.payload.user));
      localStorage.setItem('agrovia_token', action.payload.token);
    },
    clearCredentials(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('agrovia_user');
      localStorage.removeItem('agrovia_token');
    }
  }
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;