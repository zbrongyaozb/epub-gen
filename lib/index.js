const path = require("path");
const fs = require("fs");
const { uuid, isString, isArray, isEmpty, extend } = require("./helpers");
const uslug = require("uslug");
const ejs = require("ejs");
const cheerio = require("cheerio");
const entities = require("entities");
const request = require("superagent");
const fsextra = require("fs-extra");
const { remove: diacritics } = require("diacritics");
const mime = require("mime");
const archiver = require("archiver");

class EPub {
	constructor(options, output) {
		this.options = options;
		const self = this;

		if (output) {
			this.options.output = output;
		}

		if (!this.options.output) {
			console.error(new Error("No Output Path"));
			this.defer.reject(new Error("No output path"));
			return;
		}

		if (!options.title || !options.content) {
			console.error(new Error("Title and content are both required"));
			this.defer.reject(new Error("Title and content are both required"));
			return;
		}

		this.options = extend({
			description: options.title,
			publisher: "anonymous",
			author: ["anonymous"],
			tocTitle: "Table Of Contents",
			appendChapterTitles: true,
			date: new Date().toISOString(),
			lang: "en",
			fonts: [],
			customOpfTemplatePath: null,
			customNcxTocTemplatePath: null,
			customHtmlTocTemplatePath: null,
			version: 3,
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36"
		}, options);

		if (this.options.version === 2) {
			this.options.docHeader = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${self.options.lang}">
`;
		} else {
			this.options.docHeader = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${self.options.lang}">
`;
		}

		if (isString(this.options.author)) {
			this.options.author = [this.options.author];
		}
		if (isEmpty(this.options.author)) {
			this.options.author = ["anonymous"];
		}
		if (!this.options.tempDir) {
			this.options.tempDir = path.resolve(__dirname, "../tempDir/");
		}
		this.id = uuid();
		this.uuid = path.resolve(this.options.tempDir, this.id);
		this.options.uuid = this.uuid;
		this.options.id = this.id;
		this.options.images = [];
		this.options.content = this.options.content.map(function(content, index) {
			if (!content.filename) {
				const titleSlug = uslug(diacritics(content.title || "no title"));
				content.href = `${index}_${titleSlug}.xhtml`;
				content.filePath = path.resolve(self.uuid, `./OEBPS/${index}_${titleSlug}.xhtml`);
			} else {
				content.href = content.filename.match(/\.xhtml$/) ? content.filename : `${content.filename}.xhtml`;
				if (content.filename.match(/\.xhtml$/)) {
					content.filePath = path.resolve(self.uuid, `./OEBPS/${content.filename}`);
				} else {
					content.filePath = path.resolve(self.uuid, `./OEBPS/${content.filename}.xhtml`);
				}
			}

			content.id = `item_${index}`;
			content.dir = path.dirname(content.filePath);
			if (!content.excludeFromToc) { content.excludeFromToc = false; }
			if (!content.beforeToc) { content.beforeToc = false; }

			// Fix Author Array
			if (content.author && isString(content.author)) {
				content.author = [content.author];
			} else if (!content.author || !isArray(content.author)) {
				content.author = [];
			}

			const allowedAttributes = ["content", "alt" ,"id","title", "src", "href", "about", "accesskey", "aria-activedescendant", "aria-atomic", "aria-autocomplete", "aria-busy", "aria-checked", "aria-controls", "aria-describedat", "aria-describedby", "aria-disabled", "aria-dropeffect", "aria-expanded", "aria-flowto", "aria-grabbed", "aria-haspopup", "aria-hidden", "aria-invalid", "aria-label", "aria-labelledby", "aria-level", "aria-live", "aria-multiline", "aria-multiselectable", "aria-orientation", "aria-owns", "aria-posinset", "aria-pressed", "aria-readonly", "aria-relevant", "aria-required", "aria-selected", "aria-setsize", "aria-sort", "aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext", "class", "content", "contenteditable", "contextmenu", "datatype", "dir", "draggable", "dropzone", "hidden", "hreflang", "id", "inlist", "itemid", "itemref", "itemscope", "itemtype", "lang", "media", "ns1:type", "ns2:alphabet", "ns2:ph", "onabort", "onblur", "oncanplay", "oncanplaythrough", "onchange", "onclick", "oncontextmenu", "ondblclick", "ondrag", "ondragend", "ondragenter", "ondragleave", "ondragover", "ondragstart", "ondrop", "ondurationchange", "onemptied", "onended", "onerror", "onfocus", "oninput", "oninvalid", "onkeydown", "onkeypress", "onkeyup", "onload", "onloadeddata", "onloadedmetadata", "onloadstart", "onmousedown", "onmousemove", "onmouseout", "onmouseover", "onmouseup", "onmousewheel", "onpause", "onplay", "onplaying", "onprogress", "onratechange", "onreadystatechange", "onreset", "onscroll", "onseeked", "onseeking", "onselect", "onshow", "onstalled", "onsubmit", "onsuspend", "ontimeupdate", "onvolumechange", "onwaiting", "prefix", "property", "rel", "resource", "rev", "role", "spellcheck", "style", "tabindex", "target", "title", "type", "typeof", "vocab", "xml:base", "xml:lang", "xml:space", "colspan", "rowspan", "epub:type", "epub:prefix"],
				allowedXhtml11Tags = ["div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "dl", "dt", "dd", "address", "hr", "pre", "blockquote", "center", "ins", "del", "a", "span", "bdo", "br", "em", "strong", "dfn", "code", "samp", "kbd", "bar", "cite", "abbr", "acronym", "q", "sub", "sup", "tt", "i", "b", "big", "small", "u", "s", "strike", "basefont", "font", "object", "param", "img", "table", "caption", "colgroup", "col", "thead", "tfoot", "tbody", "tr", "th", "td", "embed", "applet", "iframe", "img", "map", "noscript", "ns:svg", "object", "script", "table", "tt", "var"];

			let $ = cheerio.load(content.data, {
				withDomLvl1: true,
				lowerCaseTags: true,
				recognizeSelfClosing: true
			});

			$($("body > *").get().reverse()).each(function(elemIndex, elem) {
				const attrs = elem.attribs,
					that = this;
				if (["img", "br", "hr"].includes(that.name)) {
					if (that.name === "img") {
						$(that).attr("alt", $(that).attr("alt") || "image-placeholder");
					}
				}

				for (let k in attrs) {
					if (allowedAttributes.includes(k)) {
						if (k === "type") {
							if (that.name !== "script") {
								$(that).removeAttr(k);
							}
						}
					} else {
						$(that).removeAttr(k);
					}
				}
				if (self.options.version === 2) {
					if (!allowedXhtml11Tags.includes(that.name)) {
						if (self.options.verbose) { console.log("Warning (content[" + index + "]):", that.name, "tag isn't allowed on EPUB 2/XHTML 1.1 DTD."); }
						const child = $(that).html();
						$(that).replaceWith($("<div>" + child + "</div>"));
					}
				}
			});

			$("img").each(function(index, elem) {
				const url = $(elem).attr("src");
				let extension, id, image;
				image = self.options.images.find(element => element.url === url);
				if (image) {
					({ id } = image);
					({ extension } = image);
				} else {
					id = uuid();
					const { dir } = content,
						mediaType = mime.getType(url.replace(/\?.*/, ""));
					extension = mime.getExtension(mediaType);
					self.options.images.push({id, url, dir, mediaType, extension});
				}
				$(elem).attr("src", `images/${id}.${extension}`);
			});

			content.data = $.html("body > *", { xmlMode: true });
			return content;
		});

		if (this.options.cover) {
			this.options._coverMediaType = mime.getType(this.options.cover);
			this.options._coverExtension = mime.getExtension(this.options._coverMediaType);
		}

		return this.render();
	}

	async render() {
		const self = this;

		if (self.options.verbose) { console.log("Generating Template Files....."); }
		await this.generateTempFile();

		if (self.options.verbose) { console.log("Downloading Images..."); }
		await self.downloadAllImage();

		if (self.options.verbose) { console.log("Making Cover..."); }
		await self.makeCover();

		if (self.options.verbose) { console.log("Generating Epub Files..."); }
		let result = await self.genEpub();

		if (self.options.verbose) { console.log("Done."); }
		return result;
	}

	async generateTempFile() {
		const self = this;

		if (!fs.existsSync(this.options.tempDir)) {
			fs.mkdirSync(this.options.tempDir);
		}
		fs.mkdirSync(this.uuid);
		fs.mkdirSync(path.resolve(this.uuid, "./OEBPS"));
		if (!this.options.css) { this.options.css = fs.readFileSync(path.resolve(__dirname, "../templates/template.css")); }
		fs.writeFileSync(path.resolve(this.uuid, "./OEBPS/style.css"), this.options.css);
		if (self.options.fonts.length) {
			fs.mkdirSync(path.resolve(this.uuid, "./OEBPS/fonts"));
			this.options.fonts = this.options.fonts.map((font) => {
				if (!fs.existsSync(font)) {
					throw new Error("Custom font not found at " + font + ".");
				}
				const filename = path.basename(font);
				fsextra.copySync(font, path.resolve(self.uuid, "./OEBPS/fonts/" + filename));
				return filename;
			});
		}
		this.options.content.forEach((content) => {
			let data = `${self.options.docHeader}
  <head>
  <title>${entities.encodeXML(content.title || "")}</title>
  <link rel="stylesheet" type="text/css" href="style.css" />
  </head>
<body>
`;
			data += content.title && self.options.appendChapterTitles ? `<h1>${entities.encodeXML(content.title)}</h1>` : "";
			data += content.title && content.author && content.author.length ? `<p class='epub-author'>${entities.encodeXML(content.author.join(", "))}</p>` : "";
			data += content.title && content.url ? `<p class='epub-link'><a href='${content.url}'>${content.url}</a></p>` : "";
			data += `${content.data}</body></html>`;
			fs.writeFileSync(content.filePath, data);
		});

		// write meta-inf/container.xml
		fs.mkdirSync(this.uuid + "/META-INF");
		fs.writeFileSync(`${this.uuid}/META-INF/container.xml`, "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\"><rootfiles><rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/></rootfiles></container>");

		if (self.options.version === 2) {
			// write meta-inf/com.apple.ibooks.display-options.xml [from pedrosanta:xhtml#6]
			fs.writeFileSync(`${this.uuid}/META-INF/com.apple.ibooks.display-options.xml`, `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<display_options>
  <platform name="*">
    <option name="specified-fonts">true</option>
  </platform>
</display_options>
`
			);
		}

		let opfPath, ncxTocPath, htmlTocPath;

		opfPath = self.options.customOpfTemplatePath || path.resolve(__dirname, `../templates/epub${self.options.version}/content.opf.ejs`);
		if (!fs.existsSync(opfPath)) {
			throw new Error("Custom file to OPF template not found.");
		}
		fs.writeFileSync(path.resolve(self.uuid , "./OEBPS/content.opf"), await ejs.renderFile(opfPath, self.options));

		ncxTocPath = self.options.customNcxTocTemplatePath || path.resolve(__dirname , "../templates/toc.ncx.ejs");
		if (!fs.existsSync(ncxTocPath)) {
			throw new Error("Custom file the NCX toc template not found.");
		}
		fs.writeFileSync(path.resolve(self.uuid , "./OEBPS/toc.ncx"), await ejs.renderFile(ncxTocPath, self.options));

		htmlTocPath = self.options.customHtmlTocTemplatePath || path.resolve(__dirname, `../templates/epub${self.options.version}/toc.xhtml.ejs`);
		if (!fs.existsSync(htmlTocPath)) {
			throw new Error("Custom file to HTML toc template not found.");
		}
		fs.writeFileSync(path.resolve(self.uuid , "./OEBPS/toc.xhtml"), await ejs.renderFile(htmlTocPath, self.options));
	}

	makeCover() {
		if (!this.options.cover) {
			return;
		}

		const self = this,
			destPath = path.resolve(this.uuid, ("./OEBPS/cover." + this.options._coverExtension));

		return new Promise((resolve, reject) => {
			let writeStream = null;
			if (self.options.cover.slice(0,4) === "http") {
				writeStream = request.get(self.options.cover).set({ "User-Agent": self.options.userAgent });
				writeStream.pipe(fs.createWriteStream(destPath));
			} else {
				writeStream = fs.createReadStream(self.options.cover);
				writeStream.pipe(fs.createWriteStream(destPath));
			}

			writeStream.on("end", function() {
				if (self.options.verbose) { console.log("[Success] cover image downloaded successfully!"); }
				resolve();
			});
			writeStream.on("error", function(err) {
				console.error("Error", err);
				reject(err);
			});
		});
	}

	downloadImage(options) {  // {id, url, mediaType}
		if (!options.url && (typeof options !== "string")) {
			return Promise.resolve(false);
		}

		const self = this,
			filename = path.resolve(self.uuid, ("./OEBPS/images/" + options.id + "." + options.extension));

		if (options.url.indexOf("file://") === 0) {
			return new Promise((resolve, reject) => {
				try {
					const auxpath = options.url.substr(7);
					fsextra.copySync(auxpath, filename);
					resolve(options);
				} catch (err) {
					reject(err);
				}
			});
		} else {
			return new Promise((resolve, reject) => {
				let requestAction;
				if (options.url.indexOf("http") === 0) {
					requestAction = request.get(options.url).set({ "User-Agent": self.options.userAgent });
					requestAction.pipe(fs.createWriteStream(filename));
				} else {
					requestAction = fs.createReadStream(path.resolve(options.dir, options.url));
					requestAction.pipe(fs.createWriteStream(filename));
				}
				requestAction.on("error", function(err) {
					if (self.options.verbose) { console.error("[Download Error]" ,"Error while downloading", options.url, err); }
					fs.unlinkSync(filename);
					reject(err);
				});

				requestAction.on("end", function() {
					if (self.options.verbose) { console.log("[Download Success]", options.url); }
					resolve(options);
				});
			});
		}
	}

	async downloadAllImage() {
		if (!this.options.images.length) {
			return;
		}

		const self = this;

		fs.mkdirSync(path.resolve(this.uuid, "./OEBPS/images"));
		return Promise.all(self.options.images.map(image => self.downloadImage(image)));
	}

	genEpub() {
		// Thanks to Paul Bradley
		// http://www.bradleymedia.org/gzip-markdown-epub/ (404 as of 28.07.2016)
		// Web Archive URL:
		// http://web.archive.org/web/20150521053611/http://www.bradleymedia.org/gzip-markdown-epub
		// or Gist:
		// https://gist.github.com/cyrilis/8d48eef37fbc108869ac32eb3ef97bca

		const self = this,
			cwd = this.uuid;

		return new Promise((resolve, reject) => {
			let archive = archiver("zip", {zlib: {level: 9}}),
				output = fs.createWriteStream(self.options.output);
			if (self.options.verbose) { console.log("Zipping temp dir to", self.options.output); }
			archive.append("application/epub+zip", {store:true, name:"mimetype"});
			archive.directory(cwd + "/META-INF", "META-INF");
			archive.directory(cwd + "/OEBPS", "OEBPS");
			archive.pipe(output);
			archive.on("end", function() {
				if (self.options.verbose) { console.log("Done zipping, clearing temp dir..."); }
				fsextra.removeSync(cwd);
				resolve();
			});
			archive.on("error", err => reject(err));
			archive.finalize();
		});
	}
}

module.exports = EPub;