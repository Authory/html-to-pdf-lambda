const { handler } = require('./index')
const fs = require('fs')

const callback = (err, result) => {
  if(err) {
    console.error(err)
  }

  if(result) {
    fs.writeFileSync('test.pdf', Buffer.from(result.data, 'base64'))
  }
}

const html = `<h1>Hello</h1>`

handler({
  html
}, null, callback)