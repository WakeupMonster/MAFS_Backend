const mongoose = require("mongoose");

const AdUnitSchema = new mongoose.Schema({
    id: { type: String, default: "" },
    active: { type: Boolean, default: false },
}, { _id: false });

const InterstitialAdUnitSchema = new mongoose.Schema({
    id: { type: String, default: "" },
    active: { type: Boolean, default: false },
    click_limit: { type: Number, default: 5 },
}, { _id: false });

const NativeAdUnitSchema = new mongoose.Schema({
    id: { type: String, default: "" },
    active: { type: Boolean, default: false },
    n_item: { type: Number, default: 25 },
}, { _id: false });

const AdsConfigSchema = new mongoose.Schema(
    {
        platform: {
            type: String,
            enum: ['android', 'ios'],
            required: true,
            unique: true
        },
        app_open: { type: AdUnitSchema, default: () => ({}) },
        interstitial: { type: InterstitialAdUnitSchema, default: () => ({}) },
        native: { type: NativeAdUnitSchema, default: () => ({}) },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    },
    { timestamps: true }
);

module.exports = mongoose.model("AdsConfiguration", AdsConfigSchema);
