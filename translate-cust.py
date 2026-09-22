import re

with open('src/routes/_authenticated/customers/index.tsx', 'r') as f:
    content = f.read()

# Add t to CustomerSheet
content = re.sub(r'(function CustomerSheet\(\{[^\}]*\}\) \{)', r'\1\n  const { t } = useTranslation();\n', content)

content = content.replace('title={customer ? "Edit customer" : "Add customer"}', 'title={customer ? t("customers.editCustomer", "Edit customer") : t("customers.addCustomer", "Add customer")}')
content = content.replace('description="Create a new customer profile or update an existing one."', 'description={t("customers.formDescription", "Create a new customer profile or update an existing one.")}')

content = content.replace('label="Contact Name"', 'label={t("customers.contactName", "Contact Name")}')
content = content.replace('label="Company name (Optional)"', 'label={t("customers.companyName", "Company name (Optional)")}')
content = content.replace('label="Mobile number"', 'label={t("common.mobile", "Mobile number")}')
content = content.replace('label="Material Interests"', 'label={t("customers.materialInterests", "Material Interests")}')
content = content.replace('label="Notes"', 'label={t("common.notes", "Notes")}')
content = content.replace('label="Email"', 'label={t("common.email", "Email")}')
content = content.replace('label="City"', 'label={t("common.city", "City")}')
content = content.replace('label="Billing address"', 'label={t("customers.billingAddress", "Billing address")}')
content = content.replace('label="State"', 'label={t("common.state", "State")}')
content = content.replace('label="Pincode"', 'label={t("common.pincode", "Pincode")}')
content = content.replace('label="GST number"', 'label={t("customers.gstNumber", "GST number")}')

content = content.replace('>Cancel<', '>{t("common.cancel", "Cancel")}<')
content = content.replace('>\n              Save\n            </Button>', '>\n              {t("common.save", "Save")}\n            </Button>')

with open('src/routes/_authenticated/customers/index.tsx', 'w') as f:
    f.write(content)

print("Customers translated")
