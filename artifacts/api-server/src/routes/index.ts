import { Router, type IRouter } from "express";
import healthRouter from "./health";
import seedRouter from "./seed";
import authRouter from "./auth";
import nftsRouter from "./nfts";
import stakeRouter from "./stake";
import plansRouter from "./plans";
import shopRouter from "./shop";

const router: IRouter = Router();

router.use(healthRouter);
router.use(seedRouter);
router.use(authRouter);
router.use(nftsRouter);
router.use(stakeRouter);
router.use(plansRouter);
router.use(shopRouter);

export default router;
