const FWB = require("./fwb.model");
const { fwbValidation, fwbUpdateValidation } = require("./fwb.validation");
const { uploadStream, destroy } = require("../upload/cloudinary.service");

/*=========1. GET ALL FWB Offer (active + expired both)=================*/
module.exports.getAllFWB = async (req, res) => {
  try {
    const now = new Date();

    // 1️. Auto-disable expired offers (real-time update)
    await FWB.updateMany(
      { expire_time: { $lte: now }, is_active: true },
      { $set: { is_active: false } },
    );

    // 2️. Count active + expired
    const [active_count, expired_count] = await Promise.all([
      FWB.countDocuments({ is_active: true }),
      FWB.countDocuments({ is_active: false }),
    ]);

    // // 3️. Get all offers (active first → expired later)
    // const data = await FWB.find()
    //   .select("-code")
    //   .sort({ is_active: -1, expire_time: 1 });

    // Fetch all FWB with correct field order
    const data = await FWB.aggregate([
      {
        $sort: { is_active: -1, createdAt: -1 }, // active first → newest first
      },
      {
        $project: {
          _id: 1,
          name: 1,
          discount: 1,
          website: 1,
          com_logo: 1,
          prod_img: 1,
          code: 1,
          expire_time: 1,
          off_details: 1,
          about_des: 1,
          is_active: 1,
          slug: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
        },
      },
    ]);

    // is_active: -1 → active on top
    // expire_time: 1 → nearest expiry first

    return res.json({
      success: true,
      message: "All FWB offers fetched",
      active_count,
      expired_count,
      data,
    });
  } catch (err) {
    console.error("Get All FWB Error →", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// module.exports.getAllFWB = async (req, res) => {
//   try {
//     const list = await FWB.find().select("-code").sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       message: "All FWB data fetched",
//       data: list,
//     });
//   } catch (err) {
//     console.error("Get All FWB Error →", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// module.exports.getAllFWB = async (req, res) => {
//   try {
//     const now = new Date();

//     const list = await FWB.aggregate([
//       {
//         $addFields: {
//           isExpired: { $lt: ["$expire_time", now] }, // true if expired
//         },
//       },
//       {
//         $sort: {
//           isExpired: 1, // false (active) → top, true (expired) → bottom
//           createdAt: -1, // newest first
//         },
//       },
//     ]);

//     res.json({
//       success: true,
//       message: "All FWB data fetched",
//       data: list,
//     });
//   } catch (err) {
//     console.error("Get All FWB Error →", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// GET SINGLE BY ID

/*=========2. GET Single FWB Offer=================*/
module.exports.getSingleFWB = async (req, res) => {
  try {
    const { id } = req.query;

    const data = await FWB.findById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: "FWB not found" });
    }

    res.json({
      success: true,
      message: "FWB details fetched",
      data,
    });
  } catch (err) {
    console.error("Get Single FWB Error →", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*=========3. CREATE or ADD FWB Offer=================*/
// module.exports.createFWB = async (req, res) => {
//   try {
//     // Validate body
//     const { error } = fwbValidation.validate(req.body);
//     if (error) {
//       return res
//         .status(400)
//         .json({ success: false, message: error.details[0].message });
//     }

//     const created = await FWB.create(req.body);

//     return res.status(201).json({
//       success: true,
//       message: "FWB created successfully",
//       data: created,
//     });
//   } catch (err) {
//     console.error("Create FWB Error →", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
// module.exports.createFWB = async (req, res) => {
//   try {
//     // Convert JSON strings from form-data
//     if (req.body.off_details && typeof req.body.off_details === "string") {
//       req.body.off_details = JSON.parse(req.body.off_details);
//     }
//     // Joi Validation
//     const { error } = fwbValidation.validate(req.body);
//     if (error) {
//       return res
//         .status(400)
//         .json({ success: false, message: error.details[0].message });
//     }

//     const fwbData = { ...req.body };

//     /*==================Upload company logo======================*/
//     if (req.files?.com_logo && req.files.com_logo[0]) {
//       const logoFile = req.files.com_logo[0];
//       const originalName = logoFile.originalname.split(".")[0]; // filename without extension

//       const uploadedLogo = await uploadStream(logoFile.buffer, {
//         folder: "mafs/fwb/company-logo",
//         public_id: originalName, // your filename
//         resource_type: "image",
//         overwrite: true,
//       });

//       fwbData.com_logo = {
//         url: uploadedLogo.secure_url,
//         publicId: uploadedLogo.public_id,
//         uploadedAt: new Date(),
//       };
//     }

//     /*==================Upload product image====================*/
//     if (req.files?.prod_img && req.files.prod_img[0]) {
//       const prodFile = req.files.prod_img[0];
//       const originalName = prodFile.originalname.split(".")[0]; // filename without extension

//       const uploadedprodFile = await uploadStream(prodFile.buffer, {
//         folder: "mafs/fwb/product-image",
//         public_id: originalName, // your filename
//         resource_type: "image",
//         overwrite: true,
//       });

//       fwbData.prod_img = {
//         url: uploadedprodFile.secure_url,
//         publicId: uploadedprodFile.public_id,
//         uploadedAt: new Date(),
//       };
//     }

//     /*==================Save new document=======================*/
//     const created = await FWB.create(fwbData);

//     return res.status(201).json({
//       success: true,
//       message: "FWB created successfully",
//       data: created,
//     });
//   } catch (err) {
//     console.error("Create FWB Error →", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

module.exports.createFWB = async (req, res) => {
  try {
    // Parse off_details if string
    if (typeof req.body.off_details === "string") {
      req.body.off_details = JSON.parse(req.body.off_details);
    }

    // Joi Validation
    const { error } = fwbValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/"/g, ""),
      });
    }

    const fwbData = { ...req.body };

    // Helper to upload an image (safe + reusable)
    const uploadImage = async (file, folder) => {
      if (!file) return null;

      const originalName = file.originalname.split(".")[0];

      return uploadStream(file.buffer, {
        folder,
        public_id: originalName,
        transformation: [{ crop: "fill", quality: "auto" }],
      });
    };

    // Start both uploads simultaneously
    const [logoUpload, prodUpload] = await Promise.all([
      uploadImage(req.files?.com_logo?.[0], "mafs/fwb/company-logo"),
      uploadImage(req.files?.prod_img?.[0], "mafs/fwb/product-image"),
    ]);

    // Assign uploaded images
    if (logoUpload) {
      fwbData.com_logo = {
        url: logoUpload.secure_url,
        publicId: logoUpload.public_id,
        uploadedAt: new Date(),
      };
    }

    if (prodUpload) {
      fwbData.prod_img = {
        url: prodUpload.secure_url,
        publicId: prodUpload.public_id,
        uploadedAt: new Date(),
      };
    }

    // Save document
    const created = await FWB.create(fwbData);

    return res.status(201).json({
      success: true,
      message: "FWB created successfully",
      data: created,
    });
  } catch (err) {
    console.error("Create FWB Error →", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/*=========4. UPDATE or PATCH FWB Offer=================*/
// module.exports.updateFWB = async (req, res) => {
//   try {
//     // Validate body
//     const { error } = fwbUpdateValidation.validate(req.body);
//     if (error) {
//       return res
//         .status(400)
//         .json({ success: false, message: error.details[0].message });
//     }
//     const { id } = req.query;

//     // --- AUTO UPDATE LOGIC ---
//     // If expire_time is included in request, force is_active = true
//     if (req.body.expire_time) {
//       const newDate = new Date(req.body.expire_time);
//       req.body.is_active = newDate > new Date();
//     }

//     const updated = await FWB.findByIdAndUpdate(id, req.body, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updated) {
//       return res.status(404).json({
//         success: false,
//         message: "FWB not found",
//       });
//     }

//     res.json({
//       success: true,
//       message: "FWB updated successfully",
//       data: updated,
//     });
//   } catch (err) {
//     console.error("Update FWB Error →", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

module.exports.updateFWB = async (req, res) => {
  try {
    const { error } = fwbUpdateValidation.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message.replace(/"/g, ""),
      });
    }

    const { id } = req.query;

    // Fetch existing FWB data
    const existingFWB = await FWB.findById(id);
    if (!existingFWB) {
      return res.status(404).json({ success: false, message: "FWB not found" });
    }

    /*====AUTO UPDATE is_active BASED ON expire_time
    =======================================================*/
    if (req.body && req.body.expire_time) {
      const newDate = new Date(req.body.expire_time);
      req.body.is_active = newDate > new Date();
    }

    let updateData = { ...req.body };

    /*====UPDATE COMPANY LOGO - Delete old from Cloudinary only if new file uploaded
    ========================================*/
    if (req.files?.com_logo && req.files.com_logo[0]) {
      const logoFile = req.files.com_logo[0];

      // Delete old logo if exists
      if (existingFWB.com_logo?.publicId) {
        await destroy(existingFWB.com_logo.publicId);
      }

      const uploadedLogo = await uploadStream(logoFile.buffer, {
        folder: "mafs/fwb/company-logo",
        public_id: logoFile.originalname.split(".")[0],
        resource_type: "image",
        overwrite: true,
      });

      updateData.com_logo = {
        url: uploadedLogo.secure_url,
        publicId: uploadedLogo.public_id,
        uploadedAt: new Date(),
      };
    }

    /*====UPDATE PRODUCT IMAGE - Delete old from Cloudinary only if new file uploaded
    =======================================*/
    if (req.files?.prod_img && req.files.prod_img[0]) {
      const prodFile = req.files.prod_img[0];

      // Delete old product image
      if (existingFWB.prod_img?.publicId) {
        await destroy(existingFWB.prod_img.publicId);
      }

      const uploadedProd = await uploadStream(prodFile.buffer, {
        folder: "mafs/fwb/product-image",
        public_id: prodFile.originalname.split(".")[0],
        resource_type: "image",
        overwrite: true,
      });

      updateData.prod_img = {
        url: uploadedProd.secure_url,
        publicId: uploadedProd.public_id,
        uploadedAt: new Date(),
      };
    }

    /*====UPDATE DOCUMENT=================================*/
    const updated = await FWB.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.json({
      success: true,
      message: "FWB updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update FWB Error →", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*=========5. DELETE FWB Offer=================*/
module.exports.deleteFWB = async (req, res) => {
  try {
    const { id } = req.query;

    const fwb = await FWB.findById(id);
    if (!fwb) {
      return res.status(404).json({
        success: false,
        message: "FWB not found",
      });
    }

    // Helper to delete a Cloudinary image safely
    const safeDelete = async (publicId) => {
      if (!publicId) return;
      try {
        await destroy(publicId);
      } catch (err) {
        console.error("Cloudinary delete error:", err.message);
      }
    };

    // Delete both images in parallel (faster)
    await Promise.all([
      safeDelete(fwb?.com_logo?.publicId),
      safeDelete(fwb?.prod_img?.publicId),
    ]);

    // Delete document
    const deleted = await FWB.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "FWB deleted successfully",
      data: deleted,
    });
  } catch (err) {
    console.error("Delete FWB Error →", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/*=========6. DELETE FWB Offer Image=================*/
module.exports.deleteFWBImage = async (req, res) => {
  try {
    const { id, type } = req.query; // type = com_logo OR prod_img

    const fwb = await FWB.findById(id);
    if (!fwb)
      return res.status(404).json({ success: false, message: "FWB not found" });

    // console.log("id: ", id);
    // console.log("type: ", type);

    const image = fwb[type];

    // console.log("image: ", image);
    if (!image?.publicId)
      return res
        .status(400)
        .json({ success: false, message: "No image found" });

    await destroy(image.publicId);

    fwb[type] = null; // remove image field
    await fwb.save();

    res.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (err) {
    console.error("Delete FWB Image Error →", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
