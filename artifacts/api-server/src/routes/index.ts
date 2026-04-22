import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import productsRouter from "./products";
import movementsRouter from "./movements";
import invoicesRouter from "./invoices";
import warehousesRouter from "./warehouses";
import usersRouter from "./users";
import settingsRouter from "./settings";
import logsRouter from "./logs";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(productsRouter);
router.use(movementsRouter);
router.use(invoicesRouter);
router.use(warehousesRouter);
router.use(usersRouter);
router.use(settingsRouter);
router.use(logsRouter);
router.use(reportsRouter);

export default router;
