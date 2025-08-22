import { connectDB } from "./db/index.js";
import { httpServer } from "./app.js";

connectDB()
.then(()=>{
    httpServer.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
})
.catch((error) => {
    console.error(`Error in the main manifesting file: ${error.message}`);
    process.exit(1);
});