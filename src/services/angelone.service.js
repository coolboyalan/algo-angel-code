import axios from "axios";

const BASE_URL = "https://apiconnect.angelbroking.com/rest/secure/angelbroking";

export async function getIntradayBalance({
  apiKey,
  token,
  clientLocalIP = "127.0.0.1",
  clientPublicIP = "127.0.0.1",
  macAddress = "AA:BB:CC:DD:EE:FF",
}) {
  try {
    const res = await axios.get(`${BASE_URL}/user/v1/getRMS`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-PrivateKey": apiKey,
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": clientLocalIP,
        "X-ClientPublicIP": clientPublicIP,
        "X-MACAddress": macAddress,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    return res.data?.data?.availableintradaypayin;
  } catch (err) {
    console.error(
      "Error fetching Intraday Balance:",
      err.response?.data || err.message,
    );
    return { net: "0", availableCash: "0", intradayBalance: "0" };
  }
}

// 🔹 Get Today’s PnL
export async function getTodaysPnL({
  apiKey,
  token,
  clientLocalIP = "127.0.0.1",
  clientPublicIP = "127.0.0.1",
  macAddress = "AA:BB:CC:DD:EE:FF",
}) {
  try {
    const res = await axios.get(`${BASE_URL}/order/v1/getPosition`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": clientLocalIP,
        "X-ClientPublicIP": clientPublicIP,
        "X-MACAddress": macAddress,
        "X-PrivateKey": apiKey,
      },
    });

    const positions = res.data.data || [];
    if (!positions.length) return 0;

    // Calculate today's PnL
    let totalPnL = 0;
    for (const pos of positions) {
      // Some contracts have mtom field directly
      if (pos.mtom) {
        totalPnL += parseFloat(pos.mtom);
      } else if (pos.netvalue) {
        totalPnL += parseFloat(pos.netvalue);
      }
    }

    return Number(totalPnL);
  } catch (err) {
    console.error("Error fetching Angel positions:", err.response?.data || err);
    return 0;
  }
}

// 🔹 Place Intraday Order
export async function placeIntradayOrder({
  apiKey,
  token,
  exchange = "NSE",
  tradingsymbol,
  symboltoken, // Required from Angel One scrip master
  transaction_type = "BUY",
  quantity = 1,
  price = 0,
  clientLocalIP = "127.0.0.1",
  clientPublicIP = "127.0.0.1",
  macAddress = "AA:BB:CC:DD:EE:FF",
}) {
  const data = {
    variety: "NORMAL",
    tradingsymbol,
    symboltoken,
    transactiontype: transaction_type,
    exchange,
    ordertype: "MARKET",
    producttype: "INTRADAY",
    duration: "DAY",
    price: price.toString(),
    squareoff: "0",
    stoploss: "0",
    quantity: quantity.toString(),
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    "X-PrivateKey": apiKey,
    "X-UserType": "USER",
    "X-SourceID": "WEB",
    "X-ClientLocalIP": clientLocalIP,
    "X-ClientPublicIP": clientPublicIP,
    "X-MACAddress": macAddress,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(`${BASE_URL}/order/v1/placeOrder`, data, {
      headers,
    });

    // API gives orderid if successful
    return response.data; // { status, message, data: { orderid, uniqueorderid, script } }
  } catch (err) {
    console.error("Error placing order:", err.response?.data || err.message);
    throw err;
  }
}

export async function getCandles({
  exchange,
  symboltoken,
  interval,
  fromdate,
  todate,
  adminKeys,
}) {
  const url =
    "https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData";
  const headers = {
    Authorization: `Bearer ${adminKeys.token}`,
    "X-PrivateKey": adminKeys.apiKey,
    "X-UserType": "USER",
    "X-SourceID": "WEB",
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-ClientLocalIP": adminKeys.localIP || "127.0.0.1",
    "X-ClientPublicIP": adminKeys.publicIP || "127.0.0.1",
    "X-MACAddress": adminKeys.mac || "00-00-00-00-00-00",
  };

  const body = { exchange, symboltoken, interval, fromdate, todate };
  const { data } = await axios.post(url, body, { headers });
  return data; // { status, message, data: { candles: [...] } } typically
}

export async function getMarketData({ mode, exchangeTokens, adminKeys }) {
  const url =
    "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/";

  const headers = {
    Authorization: `Bearer ${adminKeys.token}`,
    "X-PrivateKey": adminKeys.apiKey,
    "X-UserType": "USER",
    "X-SourceID": "WEB",
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-ClientLocalIP": adminKeys.localIP || "127.0.0.1",
    "X-ClientPublicIP": adminKeys.publicIP || "127.0.0.1",
    "X-MACAddress": adminKeys.mac || "00-00-00-00-00-00",
  };

  const body = { mode, exchangeTokens };

  try {
    const { data } = await axios.post(url, body, { headers });
    return data; // { status, message, data: { fetched: [...], unfetched: [...] } }
  } catch (err) {
    console.error(
      "Error fetching market data:",
      err.response?.data || err.message,
    );
    throw err;
  }
}
