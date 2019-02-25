const fs = require('fs');
const csv = require('fast-csv');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const CSVPath = 'input.csv';

let jsonFile = new Array();
let checkIfElementExistInsideJson = 0;
var iterationCount = 0;
let csvStream = csv
	.fromPath(CSVPath, { headers: false })
	.on('data', data => {
		data = getLineFromCSV(data);
		if (iterationCount > 0) {
			data = setSeeAllAndInvisible(data);



			if (typeof jsonFile !== 'undefined' && jsonFile.length == 0) {
				jsonFile.push(data);
			} else {
				jsonFile.forEach(element => {
					if (data.eid == element.eid) {
						jsonFile = mergeFieldWithSameID(data, jsonFile);

						checkIfElementExistInsideJson = 1;
					}
				});
				if (checkIfElementExistInsideJson == 0) {
					jsonFile.push(data);
				}
				checkIfElementExistInsideJson = 0;
			}
		}
		iterationCount++;
	})

	.on('end', () => {
		jsonFile = addAdresses(jsonFile);
		
		jsonFile = addClasses(jsonFile);
		
		jsonFile = searchUnecessaryInformation(jsonFile);
		printJSON(jsonFile);

		
	});

function printJSON(finalJson) {
	let stringJson =JSON.stringify(finalJson,null,2)
	fs.writeFile('output.json', stringJson, err => {
		if (err) throw err;
	});
}
function getLineFromCSV(data) {
	let fixedData = {};
	if (iterationCount == 0) {
		takeHeaders = data;
		takeHeaders.splice(3, 1, 'class2');
		
	} else
		for (let index = 0; index < 12; index++) {
			fixedData[takeHeaders[index]] = data[index];
		}
		
	return fixedData;
}
function setSeeAllAndInvisible(data) {
	
	for (let key in data)
			{
				if (key=='see_all' || key == 'invisible'){
					if (data[key] == '1' || data[key] == 'yes'){
						data[key] = 'true';
					}
					else if (data[key]=='0' || data[key] == 'no'||data[key]==''){
						data[key] = 'false';
					}

				}
			}
	return data;
	
}
function mergeFieldWithSameID(newInfo, JSONFile) {
	let mergedJson = [];
	JSONFile.forEach(element => {
		if (newInfo.eid == element.eid) {
			for (let key in newInfo) {
				if (
					key != 'fullname' &&
					key != 'eid' &&
					key != 'invisible' &&
					key != 'see_all'
				) {
					if (element != undefined) {
						element[key] = element[key] + ',' + newInfo[key];
					} else {
						element.key = newInfo[key];
					}
				} else {
					if (newInfo.invisible != 'false') {
						element.invisible = "true";
					} else {
						if (newInfo.see_all != 'false') {
							element.see_all = "true";
						}
					}
				}
			}
			mergedJson.push(element);
		} else {
			mergedJson.push(element);
		}
	});
	return mergedJson;
}
function addAdresses(jsonFile) {
	jsonFile.forEach(element => {
		let AddressesArray = [];
		for (let key in element) {
			let address = {
				type: '',
				tags: [],
				address: ''
			};
			if (key.includes('phone')) {
				let splitedPhone;
				let splitedPieces;
				if (verifyIfExistMoreThenOneInformationsInAField(element[key])) {
					splitedPhone = element[key].split(',');
					splitedPieces = 1;
				}
				for (; splitedPieces >= 0; splitedPieces--) {
					let regNum = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\.0-9]*$/gm;
					if (regNum.test(splitedPhone[splitedPieces]) )
					{
							let number = phoneUtil.parseAndKeepRawInput(
							splitedPhone[splitedPieces],
							'BR'
						);
						if (phoneUtil.isPossibleNumber(number)) {
							address.type = 'phone';
							address.tags = addTags(key);
							address.address = splitedPhone[splitedPieces];
							AddressesArray.push(address);
						}}
				}
			}
			if (key.includes('email')) {
				let regEx = element[key].match(/\w+@\w+.com/gm);
				if (regEx != null)
				{let regExSize = regEx.length - 1;
				for (; regExSize >= 0; regExSize--) {
					address.type = 'email';
					address.tags = addTags(key);
					address.address = regEx[regExSize];
					AddressesArray.push(address);
				}}
			}
		}
		element.addresses = AddressesArray;
	});
	return jsonFile;
}
function addTags(possibleTags) {
	let splitedString = possibleTags.split(' ');
	let Tags = [];
	Tags.push(splitedString[1]);
	if (splitedString[2] != undefined) {
		Tags.push(splitedString[2]);
	}
	return Tags;
}
function addClasses(jsonFile) {
	jsonFile.forEach(element => {
		let ClassesArray = [];
		for (let key in element) {
			if (key == 'class'||key == 'class2') {
				let regEx = element[key].match(/Sala \d/gm);
				if (regEx != null)
				{let regExSize = regEx.length - 1;
				for (; regExSize >= 0; regExSize--) {
					ClassesArray.push(regEx[regExSize]);
				}}
			}
			element.classes = ClassesArray;
		}
	});
	return jsonFile;
}
function verifyIfExistMoreThenOneInformationsInAField(stringVerified) {
	if (stringVerified.includes(',')) {
		return true;
	} else if (stringVerified.includes('/')) {
		return true;
	} else {
		return false;
	}
}
function searchUnecessaryInformation(jsonFile) {
	jsonFile.forEach(element => {
		for (let key in element)
			if (
				key != 'fullname' &&
				key != 'eid' &&
				key != 'classes' &&
				key != 'addresses' &&
				key != 'invisible' &&
				key != 'see_all'
			) {
				delete element[key];
			}
	});
	return jsonFile;
}
