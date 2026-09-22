import re

with open('src/routes/_authenticated/dashboard.tsx', 'r') as f:
    content = f.read()

# Fix BusinessHealthGrid redundant t
content = re.sub(r'const \{ t \} = useTranslation\(\);\s*const \{ t \} = useTranslation\(\);', 'const { t } = useTranslation();', content)
content = re.sub(r'(const \{ t \} = useTranslation\(\);\s*)+', 'const { t } = useTranslation();\n', content)

# Fix urgentTasks loop
content = content.replace('for (const t of urgentTasks) critical.push({ label: t.title, to: "/tasks", sub: t("dashboard.radar.urgentTask") });',
                          'for (const task of urgentTasks) critical.push({ label: task.title, to: "/tasks", sub: t("dashboard.radar.urgentTask") });')


# Inject useTranslation to missing components
def inject_hook(name):
    global content
    content = re.sub(
        r'(function ' + name + r'\([^\)]*\)\s*\{)',
        r'\1\n  const { t } = useTranslation();\n',
        content
    )

inject_hook('CashFlowSnapshot')
inject_hook('DispatchAndInstallation')
inject_hook('SalesCommandCentre')
inject_hook('QuickActionsDock')

with open('src/routes/_authenticated/dashboard.tsx', 'w') as f:
    f.write(content)

print("Dashboard TS errors fixed")
