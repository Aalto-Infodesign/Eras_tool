import styles from "./FileFormat.module.css"

export function FileFormat() {
  return (
    <div className={styles.fileFormat}>
      <div>
        <h5>How to format your file for ERAS</h5>
        <p>You can use .TSV, .CSV and .txt files</p>
      </div>
      <table>
        <thead>
          <tr>
            <td>FINNGENID (string)</td>
            <td>stage (string)</td>
            <td>age (number)</td>
            <td>date (Date)</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>FINNGENID1</td>
            <td>first stage name</td>
            <td>XX</td>
            <td>YYYY-MM-DD</td>
          </tr>
          <tr>
            <td>FINNGENID1</td>
            <td>second stage name</td>
            <td>XX</td>
            <td>YYYY-MM-DD</td>
          </tr>
          <tr>
            <td>FINNGENID2</td>
            <td>first stage name</td>
            <td>XX</td>
            <td>YYYY-MM-DD</td>
          </tr>
          <tr>
            <td>FINNGENID2</td>
            <td>second stage name</td>
            <td>XX</td>
            <td>YYYY-MM-DD</td>
          </tr>
          <tr>
            <td>...</td>
            <td>...</td>
            <td>...</td>
            <td>...</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
