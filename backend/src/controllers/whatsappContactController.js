const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { recordWhatsAppContact } = require('../services/whatsappContactService');
const { sendQuotationViaWhatsApp } = require('../services/quotationWhatsAppSendService');
const channels = require('../config/channels');

const initiateWhatsAppContact = asyncHandler(async (req, res) => {
  if (!channels.whatsapp) {
    throw new ApiError(410, 'WhatsApp is not connected on this CRM');
  }
  if (!req.permissions?.whatsapp?.use) {
    throw new ApiError(403, 'You do not have permission to use WhatsApp');
  }

  const result = await recordWhatsAppContact({
    req,
    leadId: req.params.id,
    templateId: req.body.templateId || null,
  });

  res.json(result);
});

const sendQuotationWhatsApp = asyncHandler(async (req, res) => {
  if (!channels.whatsapp) {
    throw new ApiError(410, 'WhatsApp is not connected on this CRM');
  }
  const result = await sendQuotationViaWhatsApp({
    req,
    leadId: req.params.id,
    quotationId: req.body.quotationId,
    phone: req.body.phone,
    saveAsAlternate: Boolean(req.body.saveAsAlternate),
  });

  res.json(result);
});

module.exports = { initiateWhatsAppContact, sendQuotationWhatsApp };
