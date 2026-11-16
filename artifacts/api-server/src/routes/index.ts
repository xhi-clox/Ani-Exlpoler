import { Router, type IRouter } from "express";
import healthRouter from "./health";
import animeRouter from "./anime";
import authRouter from "./auth";
import analysesRouter from "./analyses";
import usersRouter from "./users";
import commentsRouter from "./comments";
import collectionsRouter from "./collections";
import sourcesRouter from "./sources";
import watchRouter from "./watch";
import catalogRouter from "./catalog";

const router: IRouter = Router();

router.use(healthRouter);
router.use(animeRouter);
router.use("/auth", authRouter);
router.use("/analyses", analysesRouter);
router.use("/users", usersRouter);
router.use("/comments", commentsRouter);
router.use("/collections", collectionsRouter);
router.use(sourcesRouter);
router.use(watchRouter);
router.use(catalogRouter);

export default router;
