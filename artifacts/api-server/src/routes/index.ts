import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentsRouter from "./agents";
import runsRouter from "./runs";
import templatesRouter from "./templates";
import statsRouter from "./stats";
import toolsRouter from "./tools";
import invokeRouter from "./invoke";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentsRouter);
router.use(runsRouter);
router.use(templatesRouter);
router.use(statsRouter);
router.use(toolsRouter);
router.use(invokeRouter);

export default router;
