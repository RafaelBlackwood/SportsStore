const { HttpError } = require("./errors");

function cleanString(value, field, { min = 1, max = 200 } = {}) {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} is required.`);
  }
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < min) {
    throw new HttpError(400, `${field} is required.`);
  }
  if (cleaned.length > max) {
    throw new HttpError(400, `${field} is too long.`);
  }
  return cleaned;
}

function optionalString(value, field, max = 200) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  return cleanString(value, field, { min: 0, max });
}

function cleanEmail(value) {
  const email = cleanString(value, "Email", { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "Email address is invalid.");
  }
  return email;
}

function cleanPassword(value) {
  if (typeof value !== "string" || value.length < 10) {
    throw new HttpError(400, "Password must be at least 10 characters.");
  }
  if (value.length > 200) {
    throw new HttpError(400, "Password is too long.");
  }
  return value;
}

function cleanQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
    throw new HttpError(400, "Quantity must be between 0 and 99.");
  }
  return quantity;
}

function cleanAddress(raw = {}) {
  return {
    firstName: cleanString(raw.firstName, "First name", { max: 80 }),
    lastName: cleanString(raw.lastName, "Last name", { max: 80 }),
    company: optionalString(raw.company, "Company", 120),
    address1: cleanString(raw.address1, "Street address", { max: 160 }),
    address2: optionalString(raw.address2, "Address line 2", 160),
    city: cleanString(raw.city, "City", { max: 120 }),
    region: cleanString(raw.region, "State or region", { max: 120 }),
    country: cleanString(raw.country, "Country", { max: 120 }),
    postalCode: optionalString(raw.postalCode, "Postal code", 32),
    phone: cleanString(raw.phone, "Phone", { max: 60 }),
    email: cleanEmail(raw.email)
  };
}

module.exports = {
  cleanAddress,
  cleanEmail,
  cleanPassword,
  cleanQuantity,
  cleanString,
  optionalString
};
