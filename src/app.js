`
/$$$$$$                     /$$   /$$              
|_  $$_/                    |__/  | $$              
 | $$    /$$$$$$  /$$$$$$$  /$$ /$$$$$$   /$$   /$$
 | $$   /$$__  $$| $$__  $$| $$|_  $$_/  | $$  | $$
 | $$  | $$  \ $$| $$  \ $$| $$  | $$    | $$  | $$
 | $$  | $$  | $$| $$  | $$| $$  | $$ /$$| $$  | $$
/$$$$$$|  $$$$$$$| $$  | $$| $$  |  $$$$/|  $$$$$$$
|______/ \____  $$|__/  |__/|__/   \___/   \____  $$
        /$$  \ $$                         /$$  | $$
       |  $$$$$$/                        |  $$$$$$/
        \______/                          \______/ 
`

const express = require('express');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const indexRouter = require('./routes/index');

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet()); // https://expressjs.com/en/advanced/best-practice-security.html#use-helmet
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://staking-aas.vercel.app'
  ],
  credentials: true
}));

app.get('/', (req, res) => {
  res.send({ message: 'Server running...' });
});

app.use('/api', indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404);
  if (req.accepts('json')) {
    res.json({ error: 'Not Found' });
    return;
  }
  next(createError.NotFound());
});

// pass any unhandled errors to the error handler
app.use(errorHandler);


module.exports = app;
