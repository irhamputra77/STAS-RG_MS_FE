
import re

with open("src/app/components/organisms/StudentModal.tsx", "r", encoding="utf-8") as f:
    content = f.read()

select_0 = """
                              <div className="sm:col-span-2">
                                <label className="mb-1 block text-[11px] font-black text-amber-900">Peran Mahasiswa</label>
                                <select
                                  value={selectedRisetOptions[0].membership.peran}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setForm((prev) => {
                                      const next = [...prev.risetMemberships];
                                      next[0].peran = value;
                                      return { ...prev, risetMemberships: next };
                                    });
                                  }}
                                  className="w-full h-9 px-3 rounded-[9px] border border-amber-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                                >
                                  {MAHASISWA_RESEARCH_ROLES.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                  ))}
                                </select>
                              </div>
"""

select_n = """
                              <div className="sm:col-span-2">
                                <label className="mb-1 block text-[11px] font-black text-amber-900">Peran Mahasiswa</label>
                                <select
                                  value={membership.peran}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setForm((prev) => ({
                                      ...prev,
                                      risetMemberships: prev.risetMemberships.map((item) =>
                                        item.projectId === option.id ? { ...item, peran: value } : item
                                      ),
                                    }));
                                  }}
                                  className="w-full h-9 px-3 rounded-[9px] border border-amber-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-300"
                                >
                                  {MAHASISWA_RESEARCH_ROLES.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                  ))}
                                </select>
                              </div>
"""

# Replace first grid end
content = content.replace(
    """                                  />
                                </div>
                              </div>
                            </div>
                          </div>""",
    """                                  />
                                </div>""" + select_0 + """
                              </div>
                            </div>
                          </div>"""
)

# Replace nth grid end
content = content.replace(
    """                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}""",
    """                                />
                              </div>""" + select_n + """
                            </div>
                          </div>
                        );
                      })}"""
)

with open("src/app/components/organisms/StudentModal.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated UI")

