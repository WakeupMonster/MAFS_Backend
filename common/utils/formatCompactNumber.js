const formatCompactNumber = (number) => {
  if (number === undefined || number === null) return "0";
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(number)
    .toLowerCase();
};

module.exports = { formatCompactNumber };
