const express = require('express');
const router = express.Router();

router.get('/landing-data', async (req, res) => {
  try {
    const businesses = [
      { id: 1, name: "A/L 06 Months", category: "Education", description: "Intensive 6 months A/L program.", logo: "default.png" },
      { id: 2, name: "O/L 06 Months", category: "Education", description: "Intensive 6 months O/L program.", logo: "default.png" },
      { id: 3, name: "Media", category: "Media & Arts", description: "Learn professional media.", logo: "default.png" },
      { id: 4, name: "Fast Track", category: "Education", description: "Special fast track learning.", logo: "default.png" }
    ];
    res.status(200).json({ businesses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error loading landing data" });
  }
});

module.exports = router;