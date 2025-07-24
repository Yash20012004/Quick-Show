import express from 'express';
import { getFavourite, getUserBookings, updateFavourite } from '../controllers/userController.js';

const userRouter=express.Router();

userRouter.get('/bookings',getUserBookings)
userRouter.post('/update-favorite',updateFavourite)
userRouter.get('/favorites',getFavourite)

export default userRouter;
