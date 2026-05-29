const fakeProfileService = require("./fakeProfile.service");
const {
  bulkCreateSchema,
  listQuerySchema,
  addCitySchema,
} = require("./fakeProfile.validation");
const { formatProfileResponse } = require("../../profile/profile.formatter");

const bulkCreate = async (req, res) => {
  try {
    const { error, value } = bulkCreateSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });

    const result = await fakeProfileService.bulkCreateFakeProfiles({
      ...value,
      adminId: req.user._id,
    });

    // Format each profile in the result
    const formattedProfiles = await Promise.all(
      result.profiles.map(async (item) => {
        const formatted = await formatProfileResponse(
          item.user,
          item.profile,
          [],
          [],
          {},
          req,
        );
        formatted.account.email = item.user.email;
        formatted.account.phone = item.user.phone;

        return {
          user: formatted,
        };
      }),
    );

    res.status(200).json({
      success: true,
      message: `${value.count} fake profiles created successfully`,
      data: {
        batchId: result.batchId,
        count: result.count,
        profiles: formattedProfiles,
      },
    });
  } catch (error) {
    console.error("Bulk Create Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const listAll = async (req, res) => {
  try {
    const { error, value } = listQuerySchema.validate(req.query);
    if (error)
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });

    const result = await fakeProfileService.listFakeProfiles(value);

    // Format each profile in the result
    const formattedData = await Promise.all(
      result.data.map(async (item) => {
        const formatted = await formatProfileResponse(
          item.user,
          item.profile,
          [],
          [],
          {},
          req,
        );
        // Append sensitive details only for Admin response
        formatted.account.email = item.user.email;
        formatted.account.phone = item.user.phone;
        return { user: formatted };
      }),
    );

    const kpiStats = {
      totalProfiles: result.kpiStats.totalProfiles,
      activeTotal: result.kpiStats.activeTotal,
      deactivatedTotal: result.kpiStats.deactivatedTotal,
      menCount: result.kpiStats.menCount,
      womenCount: result.kpiStats.womenCount,
    };

    res.status(200).json({
      success: true,
      message: "Fake profiles fetched successfully",
      pagination: result.pagination,
      kpiStats,
      data: formattedData,
    });
  } catch (error) {
    console.error("List Fake Profiles Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await fakeProfileService.toggleFakeProfile(id);
    res.status(200).json({
      success: true,
      message: `Profile status updated to ${result.accountStatus}`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteSingle = async (req, res) => {
  try {
    const { id } = req.params;
    await fakeProfileService.deleteFakeProfile(id);
    res.status(200).json({
      success: true,
      message: "Fake profile deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const addCity = async (req, res) => {
  try {
    const { error, value } = addCitySchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });

    const city = await fakeProfileService.addCity({
      ...value,
      adminId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: `City "${city.name}" added successfully`,
      data: city,
    });
  } catch (error) {
    console.error("Add City Error:", error);
    const status = error.message.includes("already") ? 409 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const listCities = async (req, res) => {
  try {
    const cities = await fakeProfileService.listCities();
    res.status(200).json({
      success: true,
      message: "Cities fetched successfully",
      data: cities,
    });
  } catch (error) {
    console.error("List Cities Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteCity = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await fakeProfileService.deleteCity(id);
    res.status(200).json({
      success: true,
      message: `City "${result.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Delete City Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  bulkCreate,
  listAll,
  toggleStatus,
  deleteSingle,
  addCity,
  listCities,
  deleteCity,
};
