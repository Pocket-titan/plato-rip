/*
	plato-rip v1.0
	get entries from plato.stanford.edu and turn them into nicely-looking printable pdfs
	if you want to modify the looks of the pdf, edit style.css
	good luck with your studies! :D
*/

import prompt from 'prompt'
import cheerio from 'cheerio'
import fetch from 'node-fetch'
import pdf from 'html-pdf'
import fs from 'fs'

prompt.message = ''
prompt.delimiter = ':'

const readFileAsync = (path, encoding) => new Promise((resolve, reject) => {
	fs.readFile(path, encoding, (err, result) => {
		if (err) {
			console.error(`Error reading file ${path}`)
			reject(err)
		} else {
			resolve(result)
		}
	})
})

const isValidUrl = url => {
	const regex = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i
	return regex.test(url) && url.includes('plato.stanford.edu/entries/')
}

const isValidFilename = filename => {
	const regex = /^[0-9a-zA-Z\^\&\'\@\{\}\[\]\,\$\=\!\-\#\(\)\.\%\+\~\_ ]+$/
	return regex.test(filename)
}

let unwantedElements = [
	'div[id="article-copyright"]',
	'div[id="pubinfo"]',
	'div[id="academic-tools"]',
	'div[id="other-internet-resources"]',
	'div[id="related-entries"]',
]

prompt.start()
prompt.get([{
	name: 'plato url',
	required: true,
	type: 'string',
	message: 'Invalid plato url (url should include plato.stanford.edu/entries/)',
	conform: isValidUrl,
}, {
	name: 'output filename',
	default: 'output',
	type: 'string',
	message: 'Invalid filename',
	conform: isValidFilename,
}], async (err, results) => {
	if (err) {
		return console.error(err)
	}
	const html = await getHtml(results['plato url'])
	htmlToPdf(html, results['output filename'])
})

const getHtml = async url => {
	const response = await fetch(url)
	if (!response.ok) {
		return console.error('Error fetching url, status:', response.status)
	}
	const text = await response.text()
	const $ = cheerio.load(text)

	// exclude unwanted elements
	$('*').contents().each((index, element) => {
		if (element.nodeType === 8) {
			if (element.nodeValue === 'pdf exclude begin') {
				$(element).next().remove()
			}
		}
	})
	unwantedElements.forEach(selector =>
		$(selector).remove()
	)

	const article = $('div[id="article"]')
	const body = article.html()
	const style = await readFileAsync('./style.css', 'utf-8')
	const html = `
	<html lang="en-us">
		<head>
			<meta charset="utf-8"/>
			<style>
				${style}
			</style>
		</head>
		<body>
			${body}
		</body>
	</html>
	`
	return html
}

const htmlToPdf = (html, filename) => {
	const options = {
		format: "A4",
		border: {
			top: "2cm",
			right: "2cm",
			bottom: "2cm",
			left: "2cm",
		},
		footer: {
			height: "1mm",
			contents: {
				default: '<div style="text-align: center; width: 100%; padding-top: 10px;"><span>{{page}}</span></div>'
			}
		}
	}
	pdf.create(
		html,
		options
	).toFile(
		`./${filename}.pdf`,
		(err, res) => {
			if (err) {
				return console.error('Error creating pdf file', err)
			}
			console.log(`Sucessfully created pdf at '${res.filename}'`)
		}
	)
}