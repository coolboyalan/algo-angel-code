import axios from "axios";

const BASE_URL = "https://api.upstox.com/v2";

/**
 * Fetches the total Profit and Loss (PnL) for today's open positions from Upstox.
 *
 * @param {string} token - The access token.
 * @returns {Promise<number>} A promise that resolves with the total PnL for the day.
 */
export async function getTodaysPnL({ token }) {
  try {
    const response = await axios.get(`${BASE_URL}/portfolio/get-positions`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const positions = response.data?.data || [];
    if (positions.length === 0) {
      return 0;
    }

    // Sum the 'pnl' field from each position to get the total PnL [6].
    const totalPnL = positions.reduce(
      (acc, pos) => acc + parseFloat(pos.pnl || 0),
      0,
    );

    return totalPnL;
  } catch (err) {
    console.error(
      "Error fetching Upstox positions:",
      err.response?.data || err.message,
    );
    return 0; // Return 0 on error
  }
}

/**
 * Places an intraday market order on Upstox.
 *
 * @param {object} params
 * @param {string} params.token - The access token.
 * @param {string} params.instrument_key - The unique key for the instrument (e.g., 'NSE_EQ|INE669E01016') [7].
 * @param {string} params.transaction_type - "BUY" or "SELL".
 * @param {number} params.quantity - The number of shares to trade.
 * @returns {Promise<object>} A promise that resolves with the API response, containing the order ID on success.
 */
export async function placeIntradayOrder({
  token,
  instrument_key,
  transaction_type = "BUY",
  quantity = 1,
}) {
  const data = {
    quantity,
    product: "I", // 'I' for Intraday [7]
    validity: "DAY",
    order_type: "MARKET", // Market order
    instrument_token: instrument_key,
    transaction_type,
    price: 0, // Not required for market orders
    trigger_price: 0, // Not required for market orders
    disclosed_quantity: 0,
    is_amo: false, // Not an After Market Order
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    const response = await axios.post(`${BASE_URL}/order/place`, data, {
      headers,
    });
    // The response contains the order_id if successful [7].
    return response.data; // { status: 'success', data: { order_id: '...' } }
  } catch (err) {
    console.error(
      "Error placing Upstox order:",
      err.response?.data || err.message,
    );
    throw err;
  }
}
