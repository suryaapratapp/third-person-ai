import { google } from "googleapis";
import readline from "readline";
import dotenv from "dotenv";

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scopes = ["https://www.googleapis.com/auth/drive.file"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: scopes,
  prompt: "consent",
});

console.log("Authorize this app by visiting this URL:\n", authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the code from the page: ", async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  console.log("\nRefresh Token:", tokens.refresh_token);
  rl.close();
});