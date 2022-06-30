import * as express from 'express'
import * as bodyParser from 'body-parser'
import exp = require('constants')

const app = express()
const port = 3000


app.use(bodyParser.text({ type: '*/*' }))
app.use(express.static('public'));

app.post('/api/legado', require('./api/legado'))
app.post('/api/ra', require('./api/ra'))

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
