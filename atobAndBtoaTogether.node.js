"use strict";
module.exports = (() => {
	"use strict";
	const log = Math.log;
	const LN2 = Math.LN2;
	const clz32 = Math.clz32;
	const fromCharCode = String.fromCharCode;
	const originalAtob = atob;
	const originalBtoa = btoa;
	const btoaReplacer = nonAsciiChars => {
		// make the UTF string into a binary UTF-8 encoded string
		var point = nonAsciiChars.charCodeAt(0);
		if (point >= 0xD800 && point <= 0xDBFF) {
			var nextcode = nonAsciiChars.charCodeAt(1);
			if (nextcode !== nextcode) // NaN because string is 1 code point long
				return fromCharCode(0xef/*11101111*/, 0xbf/*10111111*/, 0xbd/*10111101*/);
			// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
			if (nextcode >= 0xDC00 && nextcode <= 0xDFFF) {
				point = (point - 0xD800) * 0x400 + nextcode - 0xDC00 + 0x10000;
				if (point > 0xffff)
					return fromCharCode(
						(0x1e/*0b11110*/<<3) | (point>>>18),
						(0x2/*0b10*/<<6) | ((point>>>12)&0x3f/*0b00111111*/),
						(0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
						(0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
					);
			} else return fromCharCode(0xef, 0xbf, 0xbd);
		}
		if (point <= 0x007f) return inputString;
		else if (point <= 0x07ff) {
			return fromCharCode((0x6<<5)|(point>>>6), (0x2<<6)|(point&0x3f));
		} else return fromCharCode(
			(0xe/*0b1110*/<<4) | (point>>>12),
			(0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
			(0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
		);
	}
	const btoaUTF8 = (inputString, BOMit) => {
		return originalBtoa((BOMit ? "\xEF\xBB\xBF" : "") + inputString.replace(
			/[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g, btoaReplacer
		));
	}
	//////////////////////////////////////////////////////////////////////////////////////
	const atobReplacer = encoded => {
		let codePoint = encoded.charCodeAt(0) << 24;
		let endPos = 0;
		const leadingOnes = clz32(~codePoint);
		const stringLen = encoded.length;
		let result = "";
		if (leadingOnes < 5 && stringLen >= leadingOnes) {
			codePoint = (codePoint<<leadingOnes)>>>(24+leadingOnes);
			for (endPos = 1; endPos < leadingOnes; endPos=endPos+1|0)
				codePoint = (codePoint<<6) | (encoded.charCodeAt(endPos)&0x3f/*0b00111111*/);
			if (codePoint <= 0xFFFF) { // BMP code point
				result += fromCharCode(codePoint);
			} else if (codePoint <= 0x10FFFF) {
				// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
				codePoint -= 0x10000;
				result += fromCharCode(
					(codePoint >> 10) + 0xD800,  // highSurrogate
					(codePoint & 0x3ff) + 0xDC00 // lowSurrogate
				);
			} else endPos = 0; // to fill it in with INVALIDs
		}
		for (; endPos < stringLen; endPos=endPos+1|0) result += "\ufffd"; // replacement character
		return result;
	}
	const atobUTF8 = (inputString, keepBOM) => {
		if (!keepBOM && inputString.substring(0,3) === "\xEF\xBB\xBF")
			inputString = inputString.substring(3); // eradicate UTF-8 BOM
		// 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
		// 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
		return originalAtob(inputString).replace(/[\xc0-\xff][\x80-\xbf]*/g, atobReplacer);
	};
	return {
		"btoaUTF8": btoaUTF8,
		"atobUTF8": atobUTF8
	};
})();
