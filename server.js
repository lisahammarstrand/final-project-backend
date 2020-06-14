import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import testUserData from './data/testuser.json'
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
  },
  activepackage: {
    type: String,
    required: true
  },
  training: {
    type: String,
    required: true
  }
})


const TrainingStats = mongoose.model('TrainingStats', {
  times: {
    type: Number,
    required: true
  }
})

if (process.env.RESET_DATABASE) {
  console.log('Resetting database ...')

  const seedDatabase = async () => {
    await User.deleteMany()
    await TrainingStats.deleteMany()
    await testUserData.forEach((testUser) => new User(testUser).save())
    await testTrainingData.forEach((testTraining) => new TrainingStats(testTraining).save())
  }
  seedDatabase()
}

const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

/* // Middleware to check user's access token in DB
const authenticateUser = async (req, res, next) => {
  const user = await User.findOne({ accessToken: req.header('Authorization') })
  if (user) {
    req.user = user
    next()
  } else {
    res.status(403).json({ loggedOut: true, message: 'Please log in to access content' })
  }
} */

// Start defining your routes here
app.get('/', (req, res) => {
  res.send('Final project backend')
})

app.get('/users', async (req, res) => {
  const users = await User.find().exec()
  res.json(users)
})

app.post('/users', async (req, res) => {
  try {
    const { name, email, password, activepackage, training } = req.body
    const user = new User({ name, email, password: bcrypt.hashSync(password), activepackage, training })
    user.save()
    res.status(201).json({ id: user._id, accessToken: user.accessToken })
  } catch (err) {
    res.status(400).json({ message: 'Could not create user', errors: err.errors })
  }
})

/* app.get('/users', authenticateUser) */

app.get('/users/:userId', async (req, res) => {
  const userId = req.params.userId
  const userProfile = await User.findOne({ _id: userId }).exec()
  res.json(userProfile)
})

/* app.post('/sessions', async (req, res) => {
  const user = await User.findOne({ email: req.body.email })
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.json({ userId: user._id, accessToken: user.accessToken })
  } else {
    res.status(401).json({ notFound: true, statusCode: 401, error: "Login failed" })
  }
}) */

app.get('/trainingstats', async (req, res) => {
  const trainingStats = await TrainingStats.find().exec()
  res.json(trainingStats)
})

app.post('/trainingstats', async (req, res) => {
  const { training } = req.body
  const newTrainingStats = new TrainingStats({ training })
  newTrainingStats.save()
  res.status(201).json({ training })
})

app.put('/trainingstats/:statsId/update', async (req, res) => {
  const { statsId } = req.params
  const ERR_COULD_NOT_FIND = `Could not find ${statsId} to update`
  try {
    const updatedStats = await TrainingStats.updateOne(
      { _id: statsId },
      { $inc: { times: 1 } }
    )
    res.status(201).json(updatedStats)
  } catch (err) {
    res.status(404).json({ message: ERR_COULD_NOT_FIND })
  }
})



// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
