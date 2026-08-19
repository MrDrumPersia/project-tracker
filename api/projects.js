export default async function handler(req, res) {
  const REPO = "MrDrumPersia/project-tracker";
  const FILE = "data/projects.json";

  const TOKEN = process.env.GITHUB_TOKEN;

  if (!TOKEN) {
    return res.status(500).json({ error: "GITHUB_TOKEN تنظیم نشده است." });
  }

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };

  try {
    // دریافت اطلاعات فعلی فایل
    const getFile = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE}`,
      { headers }
    );

    let projects = [];
    let sha = null;

    if (getFile.ok) {
      const fileData = await getFile.json();
      sha = fileData.sha;

      const content = decodeURIComponent(
        escape(atob(fileData.content.replace(/\n/g, "")))
      );

      projects = JSON.parse(content);
    }

    // GET = دریافت پروژه‌ها
    if (req.method === "GET") {
      return res.status(200).json(projects);
    }

    // POST = ذخیره پروژه‌ها
    if (req.method === "POST") {
      const newProjects = req.body;

      if (!Array.isArray(newProjects)) {
        return res.status(400).json({
          error: "اطلاعات پروژه‌ها باید به صورت آرایه باشد."
        });
      }

      const content = btoa(
        unescape(encodeURIComponent(JSON.stringify(newProjects, null, 2)))
      );

      const body = {
        message: "Update projects",
        content
      };

      if (sha) {
        body.sha = sha;
      }

      const updateFile = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${FILE}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(body)
        }
      );

      const result = await updateFile.json();

      if (!updateFile.ok) {
        return res.status(updateFile.status).json(result);
      }

      return res.status(200).json({
        success: true,
        message: "پروژه‌ها با موفقیت ذخیره شدند."
      });
    }

    return res.status(405).json({
      error: "Method Not Allowed"
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
