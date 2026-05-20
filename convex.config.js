import { defineApp } from "convex/server";

const app = defineApp();
app.use(import("./convex"));

export default app;