import connect from "../connect.js";


export async function createAdminCommunityPost({ topic_id, title, body, adminId }) {
  try {
    const db = connect();

    const sql = `
      INSERT INTO community_posts
        (id, user_id, topic_id, title, body, is_admin_post)
      VALUES
        (UUID(), ?, ?, ?, ?, 1)
    `;

    await db.query(sql, [adminId, topic_id, title, body]);
  } catch (err) {
    console.error("❌ createAdminCommunityPost error:", err);
    throw new Error("Failed to create admin community post");
  }
}

export async function deleteAdminCommunityPost(postId) {
  const db = connect();

  try {
    const sql = `
      DELETE FROM community_posts
      WHERE id = ?
      AND is_admin_post = 1
    `;
    const [result] = await db.query(sql, [postId]);

    return result.affectedRows > 0;
  } catch (err) {
    console.error("deleteAdminCommunityPost error:", err);
    throw err;
  }
}

export async function getAdminCommunityPosts(offset, limit) {
  try {
    const db = connect();
    const [rows] = await db.query(
      `
      SELECT p.id, p.title, p.body, p.created_at, t.name AS topic_name
      FROM community_posts p
      LEFT JOIN community_topics t ON t.id = p.topic_id
      WHERE p.is_admin_post = 1
      ORDER BY p.created_at DESC
      LIMIT ?, ?
      `,
      [Number(offset), Number(limit)]
    );

    return rows;
  } catch (err) {
    console.error("getAdminCommunityPosts error:", err);
    throw err;
  }
}


export async function getAllComments(offset = 0, limit = 20) {
  try {
    const db = connect();
    const [rows] = await db.query(
      `
      SELECT 
        c.id,
        c.body,
        c.created_at,
        c.user_id,
        c.admin_seen,
        u.username,
        u.profile_image_url,
        p.title AS post_title
      FROM community_comments c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN community_posts p ON p.id = c.post_id
      ORDER BY c.created_at DESC
      LIMIT ?, ?
      `,
      [offset, limit]
    );
    return rows;
  } catch (err) {
    console.error("getAllComments error:", err);
    throw err;
  }
}


export async function markAllCommentsSeen(postId) {
  try {
    const db = connect();

    await db.query(
      `UPDATE community_comments SET admin_seen = 1 WHERE post_id = ?`,
      [postId]
    );

    return true;
  } catch (err) {
    console.error("markAllCommentsSeen error:", err);
    throw err;
  }
}

export async function getUnseenCommentCount() {
  try {
    const db = connect();
    const [rows] = await db.query(`
      SELECT COUNT(*) AS count
      FROM community_comments
      WHERE admin_seen = 0
    `);
    return rows[0].count;
  } catch (err) {
    console.error("getUnseenCommentCount error:", err);
    throw err;
  }
}


export async function markAllPostsSeen() {
  try {
    const db = connect();
    await db.query(`UPDATE community_posts SET admin_seen = 1`);
  } catch (err) {
    console.error("markAllPostsSeen error:", err);
    throw err;
  }
}


export async function getUnseenPostCount() {
  try {
    const db = connect();
    const [rows] = await db.query(`
      SELECT COUNT(*) AS count
      FROM community_posts
      WHERE admin_seen = 0
    `);
    return rows[0].count;
  } catch (err) {
    console.error("getUnseenPostCount error:", err);
    throw err;
  }
}

export async function getAllPosts(offset = 0, limit = 20) {
  try {
    const db = connect();
    const [rows] = await db.query(
      `
      SELECT 
        p.id,
        p.title,
        p.body,
        p.created_at,
        p.is_admin_post,
        p.admin_seen,
        t.name AS topic_name,
        u.username
      FROM community_posts p
      LEFT JOIN community_topics t ON t.id = p.topic_id
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT ?, ?
      `,
      [offset, limit]
    );
    return rows;
  } catch (err) {
    console.error("getAllPosts error:", err);
    throw err;
  }
}


export async function getPostsByTopic(topicId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        p.id,
        p.title,
        p.body,
        p.created_at,
        p.is_admin_post,
        p.admin_seen
      FROM community_posts p
      WHERE p.topic_id = ?
      ORDER BY p.created_at DESC
      `,
      [topicId]
    );

    return rows;
  } catch (err) {
    console.error("getPostsByTopic error:", err);
    throw err;
  }
}


export async function getCommentsForAdminPost(postId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        c.id,
        c.body,
        c.created_at,
        c.admin_seen,
        c.parent_id,
        c.user_id,
        u.name AS author,
        u.profile_image_url AS author_image,
        u.role AS author_role
      FROM community_comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
      `,
      [postId]
    );

    // ✅ Force all admin comments to display as "Cre8tly Studio"
    rows.forEach((c) => {
      if (c.author_role === "admin") {
        c.author = "Cre8tly Studio";
      }
    });

    return rows; // keep flat list, tree built in frontend
  } catch (err) {
    console.error("getCommentsForAdminPost error:", err);
    throw err;
  }
}




export async function createAdminComment({ postId, adminId, body, parent_id }) {
  try {
    const db = connect();

    await db.query(
      `
      INSERT INTO community_comments
        (id, post_id, parent_id, user_id, body, admin_seen)
      VALUES
        (UUID(), ?, ?, ?, ?, 1)
      `,
      [
        postId,                // post_id
        parent_id || null,     // parent_id
        adminId,               // user_id
        body,                  // body
      ]
    );
  } catch (err) {
    console.error("createAdminComment error:", err);
    throw err;
  }
}


export async function getUnseenCommentMapByPost(topicId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT p.id AS post_id, COUNT(c.id) AS unseen_count
      FROM community_posts p
      LEFT JOIN community_comments c 
        ON c.post_id = p.id AND c.admin_seen = 0
      WHERE p.topic_id = ?
      GROUP BY p.id
      `,
      [topicId]
    );

    const map = {};
    rows.forEach((r) => {
      map[r.post_id] = r.unseen_count;
    });

    return map;
  } catch (err) {
    console.error("getUnseenCommentMapByPost error:", err);
    throw err;
  }
}

export async function getUnseenCommentCountByTopic() {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        p.topic_id,
        COUNT(c.id) AS unseen_count
      FROM community_posts p
      LEFT JOIN community_comments c 
        ON c.post_id = p.id 
        AND c.admin_seen = 0
      GROUP BY p.topic_id
      `
    );

    const map = {};
    rows.forEach((r) => {
      map[r.topic_id] = r.unseen_count;
    });

    return map;
  } catch (err) {
    console.error("getUnseenCommentCountByTopic error:", err);
    throw err;
  }
}


export async function deleteAdminComment(commentId) {
  try {
    const db = connect();

    await db.query(
      `
      DELETE FROM community_comments
      WHERE id = ?
      `,
      [commentId]
    );
  } catch (err) {
    console.error("deleteAdminComment error:", err);
    throw err;
  }
}

export async function updateAdminComment(commentId, newBody) {
  try {
    const db = connect();

    await db.query(
      `
      UPDATE community_comments
      SET body = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [newBody, commentId]
    );
  } catch (err) {
    console.error("updateAdminComment error:", err);
    throw err;
  }
}

export async function getAdminSinglePost(postId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        p.id,
        p.title,
        p.body,
        p.created_at,
        p.topic_id,
        t.name AS topic_name,
        u.name AS author,
        u.profile_image_url AS author_image,
        u.role AS author_role
      FROM community_posts p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN community_topics t ON t.id = p.topic_id
      WHERE p.id = ?
      `,
      [postId]
    );

    if (!rows.length) return null;

    const post = rows[0];

    // Force admin display name
    if (post.author_role === "admin") {
      post.author = "Cre8tly Studio";
    }

    return post;

  } catch (err) {
    console.error("getAdminSinglePost error:", err);
    throw err;
  }
}






