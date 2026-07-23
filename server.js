require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Basic setup ----------
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// Serve the frontend (single HTML page)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Temp storage for uploaded video files before they're pushed to YouTube
const upload = multer({ dest: path.join(__dirname, 'tmp_uploads') });
if (!fs.existsSync(path.join(__dirname, 'tmp_uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'tmp_uploads'));
}

// ---------- Google OAuth client ----------
function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

// ---------- Auth middleware ----------
function requireLogin(req, res, next) {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Login required' });
  }
  next();
}

// ---------- Routes: Login ----------

// Step 1: user clicks "Login with Google" -> redirected here -> sent to Google
app.get('/auth/google', (req, res) => {
  const oAuth2Client = createOAuthClient();
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline', // gives us a refresh_token
    prompt: 'consent',
    scope: SCOPES,
  });
  res.redirect(url);
});

// Step 2: Google redirects back here with a ?code=
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=login_failed');

  try {
    const oAuth2Client = createOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    req.session.tokens = tokens; // { access_token, refresh_token, expiry_date, ... }
    res.redirect('/?login=success');
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.redirect('/?error=login_failed');
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ loggedIn: !!req.session.tokens });
});

// ---------- Routes: Dashboard data ----------

app.get('/api/dashboard', requireLogin, async (req, res) => {
  try {
    const oAuth2Client = createOAuthClient();
    oAuth2Client.setCredentials(req.session.tokens);
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    // Channel info + stats
    const channelResp = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      mine: true,
    });
    const channel = channelResp.data.items[0];

    // Latest videos from the channel's uploads playlist
    const uploadsPlaylistId =
      channel.contentDetails.relatedPlaylists.uploads;
    const videosResp = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 15,
    });

    res.json({
      channel: {
        title: channel.snippet.title,
        thumbnail: channel.snippet.thumbnails.default.url,
        subscribers: channel.statistics.subscriberCount,
        totalViews: channel.statistics.viewCount,
        videoCount: channel.statistics.videoCount,
      },
      videos: videosResp.data.items.map((item) => ({
        title: item.snippet.title,
        videoId: item.snippet.resourceId.videoId,
        thumbnail: item.snippet.thumbnails.medium?.url,
        publishedAt: item.snippet.publishedAt,
      })),
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Could not load dashboard data' });
  }
});

// ---------- Routes: Video upload ----------

app.post('/api/upload', requireLogin, upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file provided' });

  const { title, description, privacyStatus } = req.body;
  const filePath = req.file.path;

  try {
    const oAuth2Client = createOAuthClient();
    oAuth2Client.setCredentials(req.session.tokens);
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title || 'Untitled video',
          description: description || '',
        },
        status: {
          privacyStatus: privacyStatus || 'private', // private | unlisted | public
        },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    });

    fs.unlink(filePath, () => {}); // clean up temp file
    res.json({ ok: true, videoId: response.data.id });
  } catch (err) {
    console.error('Upload error:', err.message);
    fs.unlink(filePath, () => {});
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
});
