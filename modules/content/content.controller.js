// const Content = require("./content.model");

// /**
//  * ================================
//  * GET FAQ
//  * ================================
//  */
// exports.getFAQ = async (req, res) => {
//   try {
//     const data = await Content.findOne({ type: "faq" }).lean();

//     return res.json({
//       success: true,
//       data: data?.faqs || []
//     });
//   } catch (err) {
//     console.error("Get FAQ error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Failed to load FAQ"
//     });
//   }
// };


// /**
//  * ================================
//  * GET PRIVACY POLICY
//  * ================================
//  */
// exports.getPrivacyPolicy = async (req, res) => {
//   try {
//     const data = await Content.findOne({ type: "privacy_policy" }).lean();

//     return res.json({
//       success: true,
//       title: data?.title || "Privacy Policy",
//       sections: data?.sections || []
//     });
//   } catch (err) {
//     console.error("Privacy policy error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Failed to load privacy policy"
//     });
//   }
// };


// /**
//  * ================================
//  * GET TERMS & CONDITIONS
//  * ================================
//  */
// exports.getTermsConditions = async (req, res) => {
//   try {
//     const data = await Content.findOne({ type: "terms_conditions" }).lean();

//     return res.json({
//       success: true,
//       title: data?.title || "Terms & Conditions",
//       sections: data?.sections || []
//     });
//   } catch (err) {
//     console.error("Terms error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Failed to load terms & conditions"
//     });
//   }
// };




/**
 * ================================
 * FAQ
 * ================================
 */
exports.getFAQ = async (req, res) => {
  return res.json({
    success: true,
    data: [
      {
        question: "What is Match At First Swipe?",
        answer:
          "Match At First Swipe is a dating app designed to help you meet new people through meaningful matches based on your preferences."
      },
      {
        question: "Is Match At First Swipe free to use?",
        answer:
          "Yes, Match At First Swipe offers free features. Premium plans are available for enhanced experiences."
      },
      {
        question: "How does matching work?",
        answer:
          "Matching is based on your interests, preferences, and location to ensure better compatibility."
      },
      {
        question: "Can I change my location?",
        answer:
          "Yes, you can update your location from your profile settings."
      }
    ]
  });
};



/**
 * =========================================
 * PRIVACY POLICY
 * =========================================
 */
exports.getPrivacyPolicy = async (req, res) => {
  return res.json({
    success: true,
    title: "Privacy Policy",
    sections: [
      {
        order: 1,
        heading: "Data Collection",
        content: [
          {
            type: "paragraph",
            text:
              "Match At First Swipe collects user data, including personal information, to provide and improve our services."
          },
          {
            type: "bullets",
            items: [
              "Profile information such as name, age, and preferences",
              "Location data for matchmaking",
              "Usage patterns and in-app interactions"
            ]
          }
        ]
      },
      {
        order: 2,
        heading: "Data Use",
        content: [
          {
            type: "paragraph",
            text:
              "We use collected data to operate, maintain, and enhance the app experience."
          },
          {
            type: "bullets",
            items: [
              "Facilitate matching and communication",
              "Personalize recommendations",
              "Improve app functionality and safety"
            ]
          }
        ]
      },
      {
        order: 3,
        heading: "Data Protection",
        content: [
          {
            type: "paragraph",
            text:
              "We implement industry-standard security measures to protect user data. However, no system is entirely foolproof, and absolute security cannot be guaranteed."
          }
        ]
      },
      {
        order: 4,
        heading: "Cookies and Analytics",
        content: [
          {
            type: "paragraph",
            text:
              "We use cookies and analytics tools to understand usage patterns, improve services, and deliver relevant content."
          }
        ]
      },
      {
        order: 5,
        heading: "Third-Party Links",
        content: [
          {
            type: "paragraph",
            text:
              "The app may contain links to third-party websites or services. We are not responsible for their privacy practices."
          }
        ]
      },
      {
        order: 6,
        heading: "Data Retention",
        content: [
          {
            type: "paragraph",
            text:
              "We retain personal data only for as long as necessary to provide services or as required by law."
          }
        ]
      },
      {
        order: 7,
        heading: "Communication",
        content: [
          {
            type: "paragraph",
            text:
              "By using Match At First Swipe, you consent to receive app-related communications, including notifications and updates."
          }
        ]
      },
      {
        order: 8,
        heading: "Children’s Privacy",
        content: [
          {
            type: "paragraph",
            text:
              "Match At First Swipe is intended for users aged 18 and above. We do not knowingly collect data from minors."
          }
        ]
      },
      {
        order: 9,
        heading: "Changes to Privacy Policy",
        content: [
          {
            type: "paragraph",
            text:
              "We may update this Privacy Policy from time to time. Users will be notified of significant changes through the app."
          }
        ]
      }
    ]
  });
};


/**
 * =========================================
 * TERMS & CONDITIONS
 * =========================================
 */
exports.getTermsConditions = async (req, res) => {
  return res.json({
    success: true,
    title: "Terms & Conditions",
    sections: [
      {
        order: 1,
        heading: "Acceptance of Terms",
        content: [
          {
            type: "paragraph",
            text:
              "By accessing or using Match At First Swipe, you agree to be bound by these Terms and Conditions."
          }
        ]
      },
      {
        order: 2,
        heading: "Eligibility",
        content: [
          {
            type: "bullets",
            items: [
              "Users must be at least 18 years old",
              "Users must provide accurate and truthful information"
            ]
          }
        ]
      },
      {
        order: 3,
        heading: "Account Usage",
        content: [
          {
            type: "paragraph",
            text:
              "You are responsible for maintaining the confidentiality of your account and all activities that occur under it."
          },
          {
            type: "bullets",
            items: [
              "Do not share your login credentials",
              "Do not impersonate others",
              "Follow community guidelines at all times"
            ]
          }
        ]
      },
      {
        order: 4,
        heading: "Prohibited Activities",
        content: [
          {
            type: "bullets",
            items: [
              "Harassment, abuse, or hate speech",
              "Fraudulent or misleading activity",
              "Attempting to access systems without authorization"
            ]
          }
        ]
      },
      {
        order: 5,
        heading: "Termination",
        content: [
          {
            type: "paragraph",
            text:
              "We reserve the right to suspend or terminate accounts that violate these Terms or applicable laws."
          }
        ]
      },
      {
        order: 6,
        heading: "Limitation of Liability",
        content: [
          {
            type: "paragraph",
            text:
              "Match At First Swipe shall not be liable for any indirect, incidental, or consequential damages arising from the use of the app."
          }
        ]
      },
      {
        order: 7,
        heading: "Changes to Terms",
        content: [
          {
            type: "paragraph",
            text:
              "We may modify these Terms & Conditions at any time. Continued use of the app constitutes acceptance of the updated terms."
          }
        ]
      }
    ]
  });
};

