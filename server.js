import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt-nodejs'
import testUserData from './data/testuser.json'

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
  },
  times: {
    type: Number,
    required: true,
    default: 0
  }
})

// Deleting process.env RESET_DATABASE from Config Vars in Heroku to check if solves data storage issue
if (process.env.RESET_DATABASE) {
  console.log('Resetting database ...')

  const seedDatabase = async () => {
    await User.deleteMany()
    await testUserData.forEach((testUser) => new User(testUser).save())
  }
  seedDatabase()
}

const port = process.env.PORT || 8080
const app = express()

// Middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

// Middleware to check user's access token in DB, gets access to the complete user object
const authenticateUser = async (req, res, next) => {
  const user = await User.findOne({ accessToken: req.header('Authorization') })
  if (user) {
    req.user = user
    next()
  } else {
    res.status(403).json({ loggedOut: true, message: 'Please log in to access content' })
  }
}

//GET all users
app.get('/users', async (req, res) => {
  const users = await User.find().exec()
  res.json(users)
})

// POST – registrer new user
// researching database issue, user is saved but gone when revisiting page later
// adding "await" before "new User"
app.post('/users', async (req, res) => {
  try {
    const { name, email, password, activepackage, training } = req.body
    const user = await new User({ name, email, password: bcrypt.hashSync(password), activepackage, training })
    user.save()
    res.status(201).json({ id: user._id, accessToken: user.accessToken })
  } catch (err) {
    console.log(JSON.stringify(err))
    res.status(400).json({ message: 'Could not create user', errors: err.errors })
  }
})

// GET – find one user
app.get('/users/:userId', async (req, res) => {
  const userId = req.params.userId
  const userProfile = await User.findOne({ _id: userId }).exec()
  res.json(userProfile)
})

// GET - find one user profile after authentication check – fetching data to My page in frontend
app.get('/profile', authenticateUser)

app.get('/profile', async (req, res) => {
  res.json({ userId: req.user._id, times: req.user.times, name: req.user.name, activepackage: req.user.activepackage, training: req.user.training })
})

// PUT – Update training/workout stats times by 1 
app.put('/profile/:userId/updatestats', async (req, res) => {
  const { userId } = req.params
  console.log(req.params)
  const ERR_COULD_NOT_FIND = `Could not find ${userId} to update`
  try {
    const updatedStats = await User.updateOne(
      { _id: userId },
      { $inc: { times: 1 } }
    )
    res.status(201).json(updatedStats)
  } catch (err) {
    console.log(JSON.stringify(err))
    res.status(404).json({ message: ERR_COULD_NOT_FIND })
  }
})

// POST - sign in user
app.post('/sessions', async (req, res) => {
  const user = await User.findOne({ email: req.body.email })
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.json({ userId: user._id, accessToken: user.accessToken })
  } else {
    res.status(401).json({ notFound: true, statusCode: 401, error: "Login failed" })
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
