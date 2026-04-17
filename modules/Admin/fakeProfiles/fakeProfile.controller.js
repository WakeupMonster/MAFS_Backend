const fakeProfileService = require("./fakeProfile.service");
const {
  bulkCreateSchema,
  listQuerySchema,
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

module.exports = {
  bulkCreate,
  listAll,
  toggleStatus,
  deleteSingle,
};
