import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
/* import testUserData from './data/testuser.json' */
import testBookingData from './data/testbooking.json'
import testTrainingData from './data/testtraining.json'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/finalproject"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const User = mongoose.model('User', {
  name: {
    type: String,
    required: true,
    minlength: 2
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})

const Booking = mongoose.model('Booking', {
  package: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  trainingprogram: {
    type: String,
    required: true
  }
})

const Training = mongoose.model('Training', {
  times: {
    type: Number,
    required: true
  }
})

if (process.env.RESET_DATABASE) {
  console.log('Resetting database ...')

  const seedDatabase = async () => {
    await Booking.deleteMany()
    await Training.deleteMany()
    await testBookingData.forEach((testBooking) => new Booking(testBooking).save())
    await testTrainingData.forEach((testTraining) => new Training(testTraining).save())
  }
  seedDatabase()
}


const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

// Middleware to check user's access token in DB
const authenticateUser = async (req, res, next) => {
  const user = await User.findOne({ accessToken: req.header('Authorization') })
  if (user) {
    req.user = user
    next()
  } else {
    res.status(403).json({ loggedOut: true, message: 'Please log in to access content' })
  }
}

// Start defining your routes here
app.get('/', (req, res) => {
  res.send('Final project backend')
})

app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body
    const user = new User({ name, email, password: bcrypt.hashSync(password) })
    user.save()
    res.status(201).json({ id: user._id, accessToken: user.accessToken })
  } catch (err) {
    res.status(400).json({ message: 'Could not create user', errors: err.errors })
  }
})

app.get('/bookings', authenticateUser)

app.get('/bookings', async (req, res) => {
  const bookings = await Booking.find().exec()
  res.json(bookings)
})

app.post('/sessions', async (req, res) => {
  const user = await User.findOne({ email: req.body.email })
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.json({ userId: user._id, accessToken: user.accessToken })
  } else {
    res.status(401).json({ notFound: true, statusCode: 401, error: "Login failed" })
  }
})

app.get('/training', async (req, res) => {
  const trainings = await Training.find().exec()
  res.json(trainings)
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
