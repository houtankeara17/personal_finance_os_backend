const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const passport = require("passport");

dotenv.config();

// Load Passport strategies
require("./src/config/passport");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://personal-finance-os-gamma.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Essential if you plan to use cookies/sessions later
  }),
);

// 🚀 ADD THIS LINE TO AUTOMATICALLY APPROVE PREFLIGHT CHECKS GLOBALLY
app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(passport.initialize());

// Routes
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use("/api/plans", require("./src/routes/planRoutes"));
app.use("/api/notes", require("./src/routes/noteRoutes"));
app.use("/api/salaries", require("./src/routes/salariesRoutes"));
app.use("/api/expenses", require("./src/routes/expensesRoutes"));
app.use("/api/remittances", require("./src/routes/remittancesRoutes"));
app.use("/api/savings", require("./src/routes/savingRoutes"));
app.use("/api/bonuses", require("./src/routes/bonusRoutes"));
app.use("/api/exchangelog", require("./src/routes/exchangelogRoutes"));

app.get("/api/health", (_, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Database + Server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  });

module.exports = app;
