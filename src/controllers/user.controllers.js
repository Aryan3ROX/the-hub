import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
  //res.status(200).json({ message: "ok" })
  const { username, email, password, fullname } = req.body
  //console.log(username)

  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields are required!")
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  })
  if (existingUser)
    throw new ApiError(409, "User with this email or username already exists!")

  const avatarLocalPath = req.files?.avatar[0]?.path
  //const coverImageLocalPath = req.files?.coverImage[0]?.path

  let coverImageLocalPath
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) throw new ApiError(400, "Avatar File is required!")

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  //console.log(avatar)

  if (!avatar) throw new ApiError(400, "Avatar File is required!")

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering the user")

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully!"))
})

export { registerUser }
