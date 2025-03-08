import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateTokens = async (userID) => {
  const user = await User.findById(userID)
  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  user.refreshToken = refreshToken
  await user.save({ validateBeforeSave: false })
  return { refreshToken, accessToken }
}

const registerUser = asyncHandler(async (req, res) => {
  //res.status(200).json({ message: "ok" })
  const { username, email, password, fullname } = req.body
  // console.log(req.body)

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

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body
  if (!username && !email)
    throw new ApiError(400, "Username or Email is required!")

  let user = await User.findOne({
    $or: [{ username }, { email }],
  })

  if (!user) throw new ApiError(404, "User does not exist!")

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) throw new ApiError(401, "Password is incorrect!")

  const { refreshToken, accessToken } = await generateTokens(user._id)

  user = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    //secure: true,
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user, accessToken, refreshToken },
        "User logged in successfully!"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  )

  const options = {
    httpOnly: true,
    secure: true,
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiError(200, {}, "User Logged Out!"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized Request!")

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if (!user) throw new ApiError(401, "Invalid Refresh Token!")

    if (incomingRefreshToken !== user?.refreshToken)
      throw new ApiError(401, "Refresh Token is Invalid or Used!")

    const options = {
      httpOnly: true,
      // secure: true
    }

    const { newRefreshToken, accessToken } = await generateTokens(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed Successfully!"
        )
      )
  } catch (error) {
    throw new ApiError(401, err?.message || "Invalid Refresh Token!")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body

  const user = await User.findById(req.user?.id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) throw new ApiError(400, "Invalid Old Password!")

  user.password = newPassword

  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully!"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Fetched Successfully!"))
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
}
