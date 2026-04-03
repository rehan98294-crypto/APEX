import { Router, type IRouter } from "express";
import healthRouter from "./health";
import seedRouter from "./seed";
import authRouter from "./auth";
import nftsRouter from "./nfts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(seedRouter);
router.use(authRouter);
router.use(nftsRouter);

export default router;
