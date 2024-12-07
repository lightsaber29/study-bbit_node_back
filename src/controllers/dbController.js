import { pool } from "../../pool.js";
import AWS from 'aws-sdk';

// S3 클라이언트 초기화
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

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

// export const deleteMmSummary = async (req, res) => {
//   const { mmSummaryId } = req.params;
//   try {
//     const result = await pool.query(
//       `
//       DELETE FROM mm_summary 
//       WHERE mm_summary_id = $1 
//       RETURNING *
//       `, [mmSummaryId]);
//     if (result.rows.length === 0) {
//       return res.status(404).send('mmSummaryId not found');
//     }
//     res.status(200).send(`User with mmSummaryId ${mmSummaryId} deleted successfully`);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error deleting user');
//   }
// };

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

const deleteFileFromS3 = async (fileUrl) => {
  if (!fileUrl) return;
  
  try {
    // URL에서 버킷 이름과 키 추출
    const url = new URL(fileUrl);
    const pathSegments = url.pathname.split('/');
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    //한글 인코딩 반영
    const key = decodeURIComponent(pathSegments.slice(1).join('/')); // 첫 번째 '/' 이후의 모든 경로

    const params = {
      Bucket: bucketName,
      Key: key
    };

    const response = await s3.deleteObject(params).promise();
    // console.log('S3 deleteObject response:', response);
    // console.log('key: ', key);
    // console.log('buckName: ',bucketName);
    // console.log('pathSegments: ', pathSegments);
    // console.log(`Successfully deleted file from S3: ${fileUrl}`);
  } catch (error) {
    console.error(`Error deleting file from S3: ${fileUrl}`, error);
    throw error;
  }
};

// MM Summary 및 관련 S3 파일들 삭제하는 메인 함수
export const deleteMmSummary = async (req, res) => {
  const { mmSummaryId } = req.params;
  const client = await pool.connect();
  console.log('delete');
  try {
    // 트랜잭션 시작
    await client.query('BEGIN');

    // 삭제하기 전에 파일 URL 조회
    const urlsQuery = await client.query(
      `
      SELECT mm_summary_url, mm_original_url 
      FROM mm_summary 
      WHERE mm_summary_id = $1
      `,
      [mmSummaryId]
    );

    if (urlsQuery.rows.length === 0) {
      return res.status(404).send('mmSummaryId not found');
    }

    const { mm_summary_url, mm_original_url } = urlsQuery.rows[0];

    // S3에서 파일들 삭제
    await Promise.all([
      deleteFileFromS3(mm_summary_url),
      deleteFileFromS3(mm_original_url)
    ]);

    // 데이터베이스에서 레코드 삭제
    const deleteQuery = await client.query(
      `
      DELETE FROM mm_summary 
      WHERE mm_summary_id = $1 
      RETURNING *
      `,
      [mmSummaryId]
    );

    // 트랜잭션 커밋
    await client.query('COMMIT');

    res.status(200).json({
      message: `MM Summary with ID ${mmSummaryId} and associated files deleted successfully`,
      deletedRecord: deleteQuery.rows[0]
    });
  } catch (error) {
    // 에러 발생 시 롤백
    await client.query('ROLLBACK');
    console.error('Error in deleteMmSummary:', error);
    res.status(500).json({
      error: 'Error deleting MM Summary and associated files',
      details: error.message
    });
  } finally {
    client.release();
  }
};