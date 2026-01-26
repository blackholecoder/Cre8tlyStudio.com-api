// export function wrapEmailHtml(html) {
//   return `
//   <center>
//     <table
//       role="presentation"
//       cellpadding="0"
//       cellspacing="0"
//       width="100%"
//       style="background-color:#ffffff;"
//     >
//       <tr>
//         <td align="center">
//           <table
//             role="presentation"
//             cellpadding="0"
//             cellspacing="0"
//             width="600"
//             style="
//               max-width:600px;
//               margin:0 auto;
//               padding:32px 28px;
//               font-family: Georgia, 'Times New Roman', Times, serif;
//               font-size:18px;
//               line-height:1.6;
//               color:#111111;
//             "
//           >
//             <tr>
//               <td>
//                 ${html}
//               </td>
//             </tr>
//           </table>
//         </td>
//       </tr>
//     </table>
//   </center>
//   `;
// }
export function wrapEmailHtml(html) {
  return `
  <center>
    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      width="100%"
      style="background-color:#ffffff;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            cellpadding="0"
            cellspacing="0"
            width="600"
            style="
              max-width:600px;
              margin:0 auto;
              padding:36px 32px;
              font-family: Georgia, 'Times New Roman', Times, serif;
              font-size:32px;
              line-height:1.65;
              color:#111111;
            "
          >
            <tr>
              <td
                style="
                  font-size:32px;
                  line-height:1.65;
                "
              >
                ${html}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
  `;
}
