import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js"
import Stripe from "stripe"
// function to check availability of selected seats for a movie


const checkSeatsAvailability= async(showId,selectedSeats)=>{
    try {
        const showData=await Show.findById(showId)
        if(!showData) return false;

        const occupiedSeats=showData.occupiedSeats;

        const isAnySeatTaken=selectedSeats.some(seat=>occupiedSeats[seat]);

        return !isAnySeatTaken;
    } catch (error) {
        console.log(error);
        return false;
    }
}

export const createBooking= async (req,res)=>{
    try {
        const {userId}=req.auth();
        const {showId,selectedSeats}=req.body;
        const {origin}=req.headers;

        // check if the seat is available for the selected show
        const isAvailable=await checkSeatsAvailability(showId,selectedSeats);

        if(!isAvailable){
            return res.json({success:false,message:"Selected seats are not available."})
        }

        // get the show details
        const showData=await Show.findById(showId).populate('movie');

        // Create a new Booking 

        const booking=await Booking.create({
            user:userId,
            show:showId,
            amount:showData.showPrice*selectedSeats.length,
            bookedSeats:selectedSeats
        });

        selectedSeats.map((seat)=>{
            showData.occupiedSeats[seat]=userId;
        })
        showData.markModified('occupiedSeats');
        await showData.save();

        // Stripe Gateway Initialize
       const stripeInstance= new Stripe(process.env.STRIPE_SECRET_KEY)

       // creating line items for stripe
       const line_items=[{
        price_data:{
            currency:'usd',
            product_data:{
                name:showData.movie.title
            },
            unit_amount:Math.floor(booking.amount)*100
        },
        quantity:1
       }]
       const session =await stripeInstance.checkout.sessions.create({
        success_url:`${origin}/loading/my-bookings`,
        cancel_url:`${origin}/my-bookings`,
        line_items: line_items,
        mode:'payment',
        metadata: {
            bookingId:booking._id.toString()
        },
        // expires_in:Math.floor(Date.now()/3000)+30*60,// expires in 30 min
       })
       booking.paymentLink=session.url;
       await booking.save();
      // run inngest payment schduler function to check status after 10 min

        await inngest.send({
            name:"app/checkpayment",
            data:{
                bookingId:booking._id.toString()
            }
        })
        return res.json({success:true,url:session.url}); 

    } catch (error) {
        console.log(error.message);
        return res.json({success:false,message:error.message});
    }
}

export const getOccupiedSeats=async(req,res)=>{
    try {
        const {showId}=req.params;
        const showData=await Show.findById(showId)

        const occupiedSeats=Object.keys(showData.occupiedSeats);

        return res.json({success:true,occupiedSeats});
    } catch (error) {
        console.log(error.message);
        return res.json({success:false,message:error.message});
    }
}