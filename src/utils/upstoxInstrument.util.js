import axios from "axios";
import zlib from "node:zlib";
import cron from "node-cron";

// --- Configuration ---
const INSTRUMENTS_URL =
  "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz";

/**
 * @type {Array<Object> | null}
 * In-memory cache for the instruments data.
 */
let instrumentCache = null;

/**
 * Downloads the gzipped instruments data, extracts it, and populates the in-memory cache.
 * Returns a promise that resolves upon successful completion.
 * @returns {Promise<void>}
 */
async function downloadAndPopulateCache() {
  return new Promise((resolve, reject) => {
    console.log(
      `[${new Date().toLocaleString()}] Starting instruments download for in-memory cache...`,
    );

    axios
      .get(INSTRUMENTS_URL, { responseType: "stream" })
      .then((response) => {
        const gunzip = zlib.createGunzip();
        const chunks = [];

        // Set up a pipeline to download and decompress the data in memory.
        response.data.pipe(gunzip);

        gunzip.on("data", (chunk) => {
          chunks.push(chunk);
        });

        gunzip.on("end", () => {
          try {
            const buffer = Buffer.concat(chunks);
            const data = buffer.toString("utf8");
            instrumentCache = JSON.parse(data);
            console.log(
              `[${new Date().toLocaleString()}] In-memory cache populated with ${instrumentCache.length} instruments.`,
            );
            resolve();
          } catch (err) {
            console.error("Error parsing JSON data:", err);
            reject(err);
          }
        });

        // --- Stream Error Handling ---
        gunzip.on("error", (err) => {
          console.error("Error decompressing data:", err);
          reject(err);
        });

        response.data.on("error", (err) => {
          console.error("Error during download:", err);
          reject(err);
        });
      })
      .catch((error) => {
        console.error("Download failed:", error.message);
        reject(error);
      });
  });
}

/**
 * Reads the in-memory cache and finds the most immediate option.
 * This is now a synchronous function.
 *
 * @param {string} assetSymbol - The asset symbol to search for (e.g., 'NIFTY').
 * @param {number} strikePrice - The target strike price.
 * @param {string} optionType - The type of option ('PE' for Put, 'CE' for Call).
 * @returns {Object|null} The instrument object or null if not found.
 */
export function getUpstoxOption(assetSymbol, strikePrice, optionType) {
  if (!instrumentCache) {
    console.error(
      "Instrument cache is not populated. Please run the download first.",
    );
    return null;
  }

  // Filter instruments from the in-memory cache.
  const matchingInstruments = instrumentCache.filter(
    (instrument) =>
      instrument.asset_symbol?.toUpperCase() === assetSymbol.toUpperCase() &&
      instrument.strike_price === strikePrice &&
      instrument.instrument_type?.toUpperCase() === optionType.toUpperCase(),
  );

  if (matchingInstruments.length === 0) {
    return null;
  }

  // Find the instrument with the earliest expiry date.
  const instrument = matchingInstruments.reduce((earliest, current) =>
    current.expiry < earliest.expiry ? current : earliest,
  );

  return instrument;
}

/**
 * Main function to run the script.
 * It ensures the in-memory cache is populated (downloads if not), then runs an example lookup.
 */
export async function main() {
  try {
    // 1. Caching: Check if the in-memory cache is populated. If not, download it.
    if (instrumentCache) {
      console.log("Using in-memory instrument cache.");
    } else {
      console.log("In-memory cache is empty, populating for the first time...");
      await downloadAndPopulateCache();
    }

    // --- Example Usage ---
    // You can now call findImmediateOption synchronously whenever needed.
    console.log("\n--- Example Lookup ---");
    const niftyOption = getUpstoxOption("NIFTY", 23300, "PE");
    if (niftyOption) {
      console.log("Found immediate NIFTY 23300 PE option:", niftyOption);
    } else {
      console.log("Could not find the specified NIFTY option.");
    }
    console.log("--------------------\n");
  } catch (err) {
    // This will catch errors from the main logic or from the download function.
    if (err instanceof SyntaxError) {
      console.error(
        "Error: Failed to parse JSON. The downloaded data might be corrupted.",
      );
    } else {
      console.error(
        "An unexpected error occurred during initialization:",
        err.message,
      );
    }
  }
}

// --- Script Execution ---
// Run the main function on startup.
await main();
console.log(await getUpstoxOption("NIFTY", 24000, "CE"));

// Schedule a cron job to update the in-memory cache every day at 7:00 AM.
cron.schedule("0 7 * * *", () => {
  console.log(
    `[${new Date().toLocaleString()}] Cron job: Starting daily instruments cache update.`,
  );
  // The download function will automatically update the shared `instrumentCache` variable.
  downloadAndPopulateCache().catch((err) => {
    console.error(
      `[${new Date().toLocaleString()}] Daily cache update failed:`,
      err,
    );
  });
});

console.log("Script initialized.");
console.log(
  "A background job is scheduled to update the data daily at 7:00 AM.",
);
