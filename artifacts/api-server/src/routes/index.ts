import { Router, type IRouter } from "express";
import healthRouter from "./health";
import seedRouter from "./seed";
import authRouter from "./auth";
import nftsRouter from "./nfts";
import stakeRouter from "./stake";
import plansRouter from "./plans";
import shopRouter from "./shop";
import treeRouter from "./tree";
import depositRouter from "./deposit";
import rewardsRouter from "./rewards";
import withdrawRouter from "./withdraw";
import adminRouter from "./admin";
import userRouter from "./user";
import withdrawalAddressesRouter from "./withdrawal-addresses";
import reserveRouter from "./reserve";

const router: IRouter = Router();

router.use(healthRouter);
router.use(seedRouter);
router.use(authRouter);
router.use(nftsRouter);
router.use(stakeRouter);
router.use(plansRouter);
router.use(shopRouter);
router.use(treeRouter);
router.use(depositRouter);
router.use(rewardsRouter);
router.use(withdrawRouter);
router.use(adminRouter);
router.use(userRouter);
router.use(withdrawalAddressesRouter);
router.use(reserveRouter);

export default router;
