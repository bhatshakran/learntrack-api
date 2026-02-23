import express from "express";
import enrollmentRoutes from "./routes/enrollments";
import webhookRoutes from "./routes/webhook";
import adminRoutes from "./routes/admin";

const app = express();
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hi there!");
});
app.use("/enrollments", enrollmentRoutes);
app.use("/quizzes", webhookRoutes);
app.use("/admin", adminRoutes);
// app.use("/programs", programRoutes);

app.listen(3000, () => console.log("LearnTrack running on :3000"));
