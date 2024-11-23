import { pool } from "../../pool.js";

export const createMmSummary = async (req, res) => {
  const { 
    mm_original_url,
    mm_summary_url,
    room_id,
    created_by
  } = req.body;

  const timestamp = new Date();
  try {
    const result = await pool.query(
      `
      INSERT INTO mm_summary (
        mm_original_url, 
        mm_summary_url, 
        room_id, 
        created_by, 
        modified_by, 
        created_at, 
        modified_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [mm_original_url, mm_summary_url, room_id, created_by, created_by, timestamp, timestamp]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating mm_summary');
  }
};

export const listMmSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT * 
      FROM mm_summary
      `
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching mm_summary');
  }
};

export const oneMmSummary = async (req, res) => {
  const { mmSummaryId } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT * 
      FROM mm_summary 
      WHERE mm_summary_id = $1
      `, 
      [mmSummaryId]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('mmSummaryId not found');
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching mm_summary');
  }
};

export const deleteMmSummary = async (req, res) => {
  const { mmSummaryId } = req.params;
  try {
    const result = await pool.query(
      `
      DELETE FROM mm_summary 
      WHERE mm_summary_id = $1 
      RETURNING *
      `, [mmSummaryId]);
    if (result.rows.length === 0) {
      return res.status(404).send('mmSummaryId not found');
    }
    res.status(200).send(`User with mmSummaryId ${mmSummaryId} deleted successfully`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting user');
  }
};

// Update 쿼리 참고용
// app.put('/users/:id', async (req, res) => {
//   const { id } = req.params;
//   const { name, email } = req.body;
//   try {
//     const result = await pool.query(
//       'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
//       [name, email, id]
//     );
//     if (result.rows.length === 0) {
//       return res.status(404).send('User not found');
//     }
//     res.status(200).json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error updating user');
//   }
// });