import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import eventTypesRouter from "./event-types";
import availabilityRouter from "./availability";
import bookingsRouter from "./bookings";
import publicRouter from "./public";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(eventTypesRouter);
router.use(availabilityRouter);
router.use(bookingsRouter);
router.use(publicRouter);

export default router;
