import dotenv from "dotenv"
import connectDB from "./db/index.js"

dotenv.config({
  path: "./env",
})

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log(error)
      throw error
    })
    app.listen(process.env.PORT || 8000, () => {
      console.log(`App is listening on port ${process.env.PORT}`)
    })
  })
  .catch((err) => {
    console.log("MongoDB Connection Failed!! ", err)
  })
