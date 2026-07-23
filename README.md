# Channel Deck — YouTube Login + Upload वेबसाइट

यह प्रोजेक्ट दो हिस्सों में है:
- `backend/` — Node.js सर्वर जो Google Login संभालता है और YouTube पर वीडियो अपलोड करता है
- `frontend/` — वह वेबपेज जो यूज़र को दिखता है (डैशबोर्ड + अपलोड फॉर्म)

**ज़रूरी:** login और upload के लिए एक backend सर्वर चलाना अनिवार्य है — यह सिर्फ HTML/JS फाइल खोलकर नहीं हो सकता, क्योंकि आपका client secret सुरक्षित रूप से सिर्फ सर्वर पर ही रखा जा सकता है।

---

## पहला कदम: सबसे पहले अपनी पुरानी key/secret बदलें

आपने पहले जो API key और client secret शेयर किए थे, वे असुरक्षित हो चुके हैं। शुरू करने से पहले:
1. https://console.cloud.google.com/apis/credentials पर जाएं
2. पुरानी API key **delete** करें और नई बनाएं
3. OAuth Client पर जाकर secret को **reset** करें, या नया OAuth Client बनाएं
4. नई वैल्यू ही आगे इस्तेमाल करें

---

## Step 1 — Node.js इंस्टॉल करें
https://nodejs.org से LTS वर्शन डाउनलोड करके इंस्टॉल करें (अगर पहले से नहीं है)।

टर्मिनल/कमांड प्रॉम्प्ट में जांचें:
```
node -v
npm -v
```

## Step 2 — Google Cloud Console में सेटअप

1. https://console.cloud.google.com/apis/credentials खोलें (अपने प्रोजेक्ट में)
2. **OAuth consent screen** सेट करें (अगर पहले से नहीं है) — User type: External, अपनी ईमेल टेस्ट यूज़र के तौर पर जोड़ें
3. OAuth Client (Web application) में **Authorized redirect URIs** में जोड़ें:
   ```
   http://localhost:3000/auth/google/callback
   ```
4. **APIs & Services > Library** में जाकर **YouTube Data API v3** को Enable करें

## Step 3 — प्रोजेक्ट सेटअप करें

टर्मिनल में:
```bash
cd youtube-app/backend
npm install
```

फिर `.env.example` फाइल को कॉपी करके `.env` नाम दें, और उसमें अपनी नई client_id, client_secret भरें:
```bash
cp .env.example .env
```
(.env फाइल को किसी टेक्स्ट एडिटर में खोलकर वैल्यू भरें)

## Step 4 — सर्वर चलाएं

```bash
npm start
```

अब ब्राउज़र में खोलें:
```
http://localhost:3000
```

"Google से लॉगिन करें" पर क्लिक करें, अपने Google अकाउंट से authorize करें, और आपका डैशबोर्ड (subscribers, views, वीडियो लिस्ट) दिख जाएगा। नीचे "नया वीडियो अपलोड करें" सेक्शन से आप सीधे वीडियो अपलोड कर सकते हैं।

---

## हमेशा के लिए इंटरनेट पर डालना (Render.com पर, मुफ्त)

**ज़रूरी:** Render सीधे ZIP फाइल अपलोड नहीं लेता — कोड पहले **GitHub** पर डालना होगा, फिर Render को उस GitHub repo से जोड़ना होगा। नीचे पूरा तरीका है।

### Step A — GitHub पर कोड डालें

1. https://github.com पर मुफ्त अकाउंट बनाएं (अगर नहीं है)
2. ऊपर दाईं तरफ **+** पर क्लिक करें → **New repository**
3. नाम दें जैसे `channel-deck`, **Public** या **Private** चुनें → **Create repository**
4. उस नई repository के पेज पर **"uploading an existing file"** लिंक पर क्लिक करें
5. इस पूरे प्रोजेक्ट फोल्डर की सभी फाइलें/फोल्डर (ZIP extract करने के बाद) वहां **drag & drop** कर दें
   - ध्यान रहे: `.env` फाइल (अगर आपने लोकल में बनाई हो) अपलोड **न करें** — सिर्फ `.env.example` जाना चाहिए
6. नीचे **Commit changes** पर क्लिक करें

### Step B — Render पर डिप्लॉय करें

1. https://render.com पर जाएं, **"Get Started"** से मुफ्त अकाउंट बनाएं (GitHub से sign in करना आसान रहेगा)
2. Dashboard में **New +** → **Web Service** चुनें
3. अपनी GitHub repo (`channel-deck`) को कनेक्ट/चुनें
4. सेटिंग्स भरें:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. नीचे **Environment Variables** सेक्शन में ये सभी जोड़ें (अपनी असली वैल्यू के साथ):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` — अभी अस्थायी रूप से कुछ भी डाल दें, अगले स्टेप में सही करेंगे
   - `SESSION_SECRET` — कोई भी लंबी रैंडम स्ट्रिंग
   - `FRONTEND_URL` — अभी अस्थायी रूप से कुछ भी डाल दें
6. **Create Web Service** पर क्लिक करें — Render अब बिल्ड और डिप्लॉय करेगा (2-3 मिनट लगेंगे)
7. डिप्लॉय होने के बाद ऊपर आपको एक URL मिलेगा, जैसे:
   ```
   https://channel-deck-xxxx.onrender.com
   ```

### Step C — सही URL से अपडेट करें

1. उसी Render URL को कॉपी करें
2. Render के **Environment** सेक्शन में जाकर:
   - `GOOGLE_REDIRECT_URI` को इससे बदलें: `https://channel-deck-xxxx.onrender.com/auth/google/callback`
   - `FRONTEND_URL` को इससे बदलें: `https://channel-deck-xxxx.onrender.com`
   - Save करें (सर्वर खुद restart हो जाएगा)
3. Google Cloud Console → आपका OAuth Client → **Authorized redirect URIs** में भी यही जोड़ें:
   ```
   https://channel-deck-xxxx.onrender.com/auth/google/callback
   ```
   Save करें

### Step D — टेस्ट करें

अपने Render URL (`https://channel-deck-xxxx.onrender.com`) को ब्राउज़र में खोलें और "Google से लॉगिन करें" आज़माएं।

> **नोट (मुफ्त टियर की सीमा):** Render का फ्री प्लान कुछ मिनट बिना इस्तेमाल के "सो" जाता है — पहली बार खोलने पर पेज लोड होने में 30-50 सेकंड लग सकते हैं, यह सामान्य है।

---

## ध्यान रखने वाली बातें

- `.env` फाइल कभी भी किसी के साथ शेयर न करें या GitHub पर अपलोड न करें
- YouTube upload के लिए Google का OAuth consent screen जब तक "verified" (Google से approved) नहीं होता, सिर्फ आपकी जोड़ी हुई "test users" ही लॉगिन कर पाएंगी — बाकी लोगों के लिए यह एक warning screen दिखाएगा
- बड़ी वीडियो फाइलों के अपलोड में समय लग सकता है; धैर्य रखें
