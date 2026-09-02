
import re

with open("src/app/components/organisms/StudentModal.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import
if "MAHASISWA_RESEARCH_ROLES" not in content:
    content = content.replace(
        "import { getWfhSummary, getWfhSourceMeta } from \"../../lib/wfh\";",
        "import { getWfhSummary, getWfhSourceMeta } from \"../../lib/wfh\";\nimport { MAHASISWA_RESEARCH_ROLES } from \"../../lib/researchRoles\";"
    )

# 2. Update ResearchMembershipForm type
content = content.replace(
    "type ResearchMembershipForm = {\n  projectId: string;\n  bergabung: string;\n  selesai: string;\n};",
    "type ResearchMembershipForm = {\n  projectId: string;\n  bergabung: string;\n  selesai: string;\n  peran: string;\n};"
)

# 3. Update normalizeResearchMembershipForms
content = content.replace(
    "          const projectId = String(membership?.project_id || membership?.projectId || membership?.id || \"\").trim();\n          if (!projectId) return null;\n\n          return {\n            projectId,\n            bergabung: membership?.bergabung || fallbackBergabung || \"\",\n            selesai: membership?.selesai || \"\",\n          };",
    "          const projectId = String(membership?.project_id || membership?.projectId || membership?.id || \"\").trim();\n          if (!projectId) return null;\n\n          return {\n            projectId,\n            bergabung: membership?.bergabung || fallbackBergabung || \"\",\n            selesai: membership?.selesai || \"\",\n            peran: membership?.peran || \"Anggota Riset\",\n          };"
)
content = content.replace(
    "      return {\n        projectId: normalizedId,\n        bergabung: fallbackBergabung || \"\",\n        selesai: \"\",\n      };\n    })\n    .filter(Boolean) as ResearchMembershipForm[];",
    "      return {\n        projectId: normalizedId,\n        bergabung: fallbackBergabung || \"\",\n        selesai: \"\",\n        peran: \"Anggota Riset\",\n      };\n    })\n    .filter(Boolean) as ResearchMembershipForm[];"
)

# 4. Update dropdown for new membership
content = content.replace(
    "risetMemberships: [{ projectId, bergabung: prev.bergabung || \"\", selesai: \"\" }]",
    "risetMemberships: [{ projectId, bergabung: prev.bergabung || \"\", selesai: \"\", peran: \"Anggota Riset\" }]"
)
content = content.replace(
    "risetMemberships: [...prev.risetMemberships, { projectId, bergabung: prev.bergabung || \"\", selesai: \"\" }]",
    "risetMemberships: [...prev.risetMemberships, { projectId, bergabung: prev.bergabung || \"\", selesai: \"\", peran: \"Anggota Riset\" }]"
)

# 5. Update payload
content = content.replace(
    "            projectId: membership.projectId,\n            bergabung: membership.bergabung || form.bergabung || null,\n            selesai: membership.selesai || null,\n          })),",
    "            projectId: membership.projectId,\n            bergabung: membership.bergabung || form.bergabung || null,\n            selesai: membership.selesai || null,\n            peran: membership.peran || \"Anggota Riset\",\n          })),"
)

with open("src/app/components/organisms/StudentModal.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated basic logic")

