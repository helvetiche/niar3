import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const getAuth = () => {
  const keyPath = path.join(process.cwd(), "firebase-service-account.json");

  let credentials: Record<string, unknown>;
  if (fs.existsSync(keyPath)) {
    credentials = JSON.parse(fs.readFileSync(keyPath, "utf8")) as Record<
      string,
      unknown
    >;
  } else {
    credentials = {
      type: "service_account",
      project_id: process.env.FIREBASE_ADMIN_PROJECT_ID ?? "",
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "",
      private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "",
    };
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
};

export const getSheets = () => {
  const auth = getAuth();
  return google.sheets({ auth, version: "v4" });
};

export const batchWriteToSheet = async (
  sheetId: string,
  updates: { range: string; values: unknown[][] }[],
): Promise<void> => {
  if (updates.length === 0) return;
  const sheets = getSheets();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updates,
    },
  });
};

export const readFromSheet = async (
  sheetId: string,
  range: string,
): Promise<unknown[][]> => {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });
  return response.data.values ?? [];
};
